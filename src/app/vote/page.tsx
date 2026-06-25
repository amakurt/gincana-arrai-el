"use client";

import useSWR from 'swr';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldAlert, Trophy, Monitor, Loader2 } from 'lucide-react';
import ShareButton from '@/components/ShareButton';

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback?: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
      }) => number;
      reset: (widgetId: number) => void;
      getResponse: (widgetId: number) => string;
    };
  }
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function VotePage() {
  const { data, error, mutate } = useSWR('/api/state', fetcher, { refreshInterval: 3000 });
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  const recaptchaContainer = useRef<HTMLDivElement>(null);
  const recaptchaReady = useRef(false);
  const recaptchaWidgetId = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && data?.currentProvaId) {
      if (data.singleVoteMode) {
        const voted = localStorage.getItem(`voted_prova_${data.currentProvaId}`);
        if (voted) {
          setHasVoted(true);
          setVotedFor(voted);
        } else {
          setHasVoted(false);
          setVotedFor(null);
        }
      }
    }
  }, [data?.currentProvaId, data?.singleVoteMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let voterId = localStorage.getItem('voter_id');
      if (!voterId) {
        voterId = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem('voter_id', voterId);
      }
    }
  }, []);

  useEffect(() => {
    const checkRecaptcha = () => {
      if (window.grecaptcha && recaptchaContainer.current && recaptchaWidgetId.current === null) {
        const id = window.grecaptcha.render(recaptchaContainer.current, {
          sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
          callback: () => { recaptchaReady.current = true; },
          'expired-callback': () => { recaptchaReady.current = false; },
        });
        recaptchaWidgetId.current = id;
      }
    };
    const interval = setInterval(checkRecaptcha, 200);
    setTimeout(() => clearInterval(interval), 10000);
    return () => { clearInterval(interval); };
  }, []);

  const getRecaptchaToken = useCallback(() => {
    if (!window.grecaptcha || recaptchaWidgetId.current === null) return Promise.resolve(null);
    const token = window.grecaptcha.getResponse(recaptchaWidgetId.current);
    return Promise.resolve(token || null);
  }, []);

  const handleVote = async (teamId: string) => {
    if (data?.status !== 'active') return;
    if (data.singleVoteMode && hasVoted) return;
    if (voting) return;
    setVoting(true);

    setCaptchaError('');

    const captchaToken = await getRecaptchaToken();
    if (!captchaToken) {
      setCaptchaError('Marque a caixa "Não sou um robô" antes de votar.');
      setVoting(false);
      return;
    }

    const voterId = localStorage.getItem('voter_id') || '';

    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote', teamId, voterId, captchaToken })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro ao registrar voto.' }));
      setCaptchaError(err.error || 'Erro ao registrar voto.');
      setVoting(false);
      return;
    }

    setVotedFor(teamId);
    setHasVoted(true);
    if (data.singleVoteMode) {
      localStorage.setItem(`voted_prova_${data.currentProvaId}`, teamId);
    }

    setVoting(false);
    if (window.grecaptcha && recaptchaWidgetId.current !== null) {
      window.grecaptcha.reset(recaptchaWidgetId.current);
    }
    recaptchaReady.current = false;
  };

  const handleVoteAgain = () => {
    setHasVoted(false);
    setVotedFor(null);
    if (window.grecaptcha && recaptchaWidgetId.current !== null) {
      window.grecaptcha.reset(recaptchaWidgetId.current);
    }
    recaptchaReady.current = false;
  };

  if (error) return <div className="mobile-container"><div className="glass" style={{padding: '2rem', textAlign: 'center'}}>Erro ao carregar sistema.</div></div>;
  if (!data) return <div className="mobile-container"><div className="glass" style={{padding: '2rem', textAlign: 'center'}}><span className="animate-pulse">Carregando...</span></div></div>;

  const isActive = data.status === 'active';
  const activeProva = data.provas.find((p: any) => p.id === data.currentProvaId);

  const teams = data.teams || [];
  const scores = data.scores || {};
  const sortedTeams = teams.map((team: any) => {
    let publicVotes = 0;
    let publicScore = 0;
    if (activeProva && scores[activeProva.id]) {
      const pScores = scores[activeProva.id];
      const maxPubVotes = Math.max(...Object.values(pScores).map((s: any) => s.publicVotes || 0), 0);
      const teamScore = pScores[team.id] || { publicVotes: 0 };
      publicVotes = teamScore.publicVotes;
      publicScore = maxPubVotes > 0 ? Number(((publicVotes / maxPubVotes) * 10).toFixed(1)) : 0;
    }
    return { ...team, publicVotes, publicScore };
  }).sort((a: any, b: any) => b.publicVotes - a.publicVotes);

  const maxVotes = Math.max(...sortedTeams.map((t: any) => t.publicVotes), 1);

  return (
    <div className="mobile-container" style={{ position: 'relative', overflow: 'hidden' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <img src="/logologos.png" alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 10, background: 'var(--logo-bg)', padding: 4, outline: '1px solid var(--logo-ring)' }} />
        <ShareButton url="/vote" label="Compartilhar" />
      </div>

      <div className={`status-banner ${isActive ? 'active' : 'waiting'}`}>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {isActive ? <span className="animate-pulse">● VOTAÇÃO ABERTA</span> : <><ShieldAlert size={18} /> {data.message}</>}
        </h2>
      </div>

      {activeProva && (
        <div className="glass" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', textAlign: 'center', border: '2px solid var(--yellow-brazil)', borderRadius: 16 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Apresentação Atual</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--blue-brazil)', margin: 0, lineHeight: 1.2 }}>{activeProva.name.toUpperCase()}</h1>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
        {hasVoted ? (
          <>
            <div className="glass" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={48} color="#10b981" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Voto Registrado!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Você votou na <strong>{data.teams.find((t: any) => t.id === votedFor)?.name}</strong>
              </p>
              {data.singleVoteMode ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                  Cada pessoa pode votar apenas uma vez por prova.
                </p>
              ) : (
                <button className="btn" onClick={handleVoteAgain} style={{ marginTop: '0.5rem', background: 'var(--blue-brazil)', width: '100%', fontSize: '0.9rem' }}>
                  VOTAR NOVAMENTE
                </button>
              )}
            </div>

            {activeProva && (
              <div className="glass" style={{ padding: '1.2rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={18} color="var(--yellow-brazil)" /> Resultado Parcial
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {sortedTeams.map((team: any, index: number) => {
                    const barWidth = (team.publicVotes / maxVotes) * 100;
                    return (
                      <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ width: '1.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>
                          {index + 1}º
                        </span>
                        <div style={{ width: '5rem', fontSize: '0.85rem', fontWeight: 700, color: team.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {team.name}
                        </div>
                        <div style={{ flex: 1, height: '1.5rem', borderRadius: 8, overflow: 'hidden', background: 'var(--warm-wood-border)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(barWidth, 2)}%` }}
                            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                            style={{ height: '100%', background: team.color, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.4rem' }}
                          >
                            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 800 }}>{team.publicVotes}</span>
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => window.open('/screen', '_blank')}
              className="btn"
              style={{ background: 'var(--blue-brazil)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Monitor size={20} /> VER PLACAR COMPLETO
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '1.8rem', textAlign: 'center', color: 'var(--blue-brazil)', marginBottom: '0.5rem' }}>Votação do Público</h1>
            {teams.map((team: any) => (
              <button 
                key={team.id}
                className="btn" 
                onClick={() => handleVote(team.id)}
                disabled={!isActive || voting}
                style={{ 
                  height: '5rem', 
                  minHeight: '60px',
                  background: team.color, 
                  fontSize: '1.4rem',
                  opacity: voting ? 0.6 : 1,
                }}
              >
                {voting ? <Loader2 size={24} className="animate-spin" /> : team.name.toUpperCase()}
              </button>
            ))}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
              <div ref={recaptchaContainer} />
            </div>
            {captchaError && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', margin: '-0.3rem 0 0 0' }}>
                {captchaError}
              </p>
            )}
          </>
        )}
      </div>

    </div>
  );
}
