"use client";

import useSWR from 'swr';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '@/hooks/useSound';
import { CheckCircle2, ShieldAlert, Loader2, ClipboardList } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import Timer from '@/components/Timer';

declare global {
  interface Window {
    turnstile?: {
      reset: (container: string | HTMLElement) => void;
      remove: (container: string | HTMLElement) => void;
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback': () => void;
        'error-callback': () => void;
      }) => string;
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
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileReady = useRef(false);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileToken = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && data?.currentProvaId) {
      if (data.singleVoteMode) {
        const voted = localStorage.getItem(`voted_prova_${data.currentProvaId}`);
        const storedReset = localStorage.getItem(`voted_reset_${data.currentProvaId}`);
        if (voted && storedReset === String(data.voterResetAt)) {
          setHasVoted(true);
          setVotedFor(voted);
        } else {
          if (voted) {
            localStorage.removeItem(`voted_prova_${data.currentProvaId}`);
          }
          setHasVoted(false);
          setVotedFor(null);
        }
      }
    }
  }, [data?.currentProvaId, data?.singleVoteMode, data?.voterResetAt]);

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
    const checkTurnstile = () => {
      if (window.turnstile && turnstileContainer.current && !turnstileWidgetId.current) {
        const id = window.turnstile.render(turnstileContainer.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
          callback: (token: string) => {
            turnstileToken.current = token;
            turnstileReady.current = true;
          },
          'expired-callback': () => {
            turnstileToken.current = null;
            turnstileReady.current = false;
          },
          'error-callback': () => {
            turnstileToken.current = null;
            turnstileReady.current = false;
          },
        });
        turnstileWidgetId.current = id;
      }
    };
    const interval = setInterval(checkTurnstile, 200);
    setTimeout(() => clearInterval(interval), 30000);
    return () => { clearInterval(interval); };
  }, []);

  const sound = useSound();

  const getTurnstileToken = useCallback(async (): Promise<string | null> => {
    if (turnstileToken.current) return turnstileToken.current;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (turnstileToken.current) return turnstileToken.current;
    }
    return null;
  }, []);

  const handleVote = async (teamId: string) => {
    if (data?.status !== 'active') return;
    if (data.singleVoteMode && hasVoted) return;
    if (voting) return;
    setVoting(true);

    setCaptchaError('');
    setCaptchaError('Aguardando verificação de segurança...');

    const cfToken = await getTurnstileToken();

    const voterId = localStorage.getItem('voter_id') || '';

    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote', teamId, voterId, cfToken })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro ao registrar voto.' }));
      setCaptchaError(err.error || 'Erro ao registrar voto.');
      setVoting(false);
      return;
    }

    setVotedFor(teamId);
    setHasVoted(true);
    sound.voteConfirm();
    if (data.singleVoteMode) {
      localStorage.setItem(`voted_prova_${data.currentProvaId}`, teamId);
      localStorage.setItem(`voted_reset_${data.currentProvaId}`, String(data.voterResetAt || 0));
    }

    setVoting(false);
    if (window.turnstile && turnstileContainer.current) {
      window.turnstile.reset(turnstileContainer.current);
    }
    turnstileReady.current = false;
  };

  const handleVoteAgain = () => {
    setHasVoted(false);
    setVotedFor(null);
    if (window.turnstile && turnstileContainer.current) {
      window.turnstile.reset(turnstileContainer.current);
    }
    turnstileReady.current = false;
  };

  if (error) return <div className="mobile-container"><div className="glass" style={{padding: '2rem', textAlign: 'center'}}>Erro ao carregar sistema.</div></div>;
  if (!data) return <div className="mobile-container"><div className="glass" style={{padding: '2rem', textAlign: 'center'}}><span className="animate-pulse">Carregando...</span></div></div>;

  const isActive = data.status === 'active';
  const activeProva = data.provas.find((p: any) => p.id === data.currentProvaId);
  const isExternalResult = activeProva?.externalResult;

  const teams = data.teams || [];

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
          {activeProva.timer > 0 && (
            <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'center' }}>
              <Timer timerDuration={activeProva.timer} timerStartedAt={data.timerStartedAt} status={data.status} />
            </div>
          )}
        </div>
      )}

      {!activeProva ? (
        <div className="glass" style={{ padding: '3rem 2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ClipboardList size={48} style={{ color: 'var(--yellow-brazil)', opacity: 0.6, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Aguardando Prova</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Nenhuma prova em andamento no momento. Aguarde o administrador iniciar a próxima apresentação.
          </p>
        </div>
      ) : isExternalResult ? (
        <div className="glass" style={{ padding: '3rem 2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ClipboardList size={48} style={{ color: 'var(--yellow-brazil)', opacity: 0.6, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Prova sem Votação</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Esta prova não tem votação do público. O resultado será definido pelo administrador.
          </p>
        </div>
      ) : hasVoted ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

        </div>
      ) : !isActive ? (
        <div className="glass" style={{ padding: '3rem 2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ClipboardList size={48} style={{ color: 'var(--yellow-brazil)', opacity: 0.6, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Aguardando Votação</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            A votação para esta prova ainda não foi aberta. Aguarde o administrador liberar a votação.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.8rem', textAlign: 'center', color: 'var(--blue-brazil)', marginBottom: '0.5rem' }}>Votação do Público</h1>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 0.5rem 0' }}>
            <div ref={turnstileContainer} style={{ width: 300, height: 65 }} />
          </div>
          {captchaError && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', margin: '-0.3rem 0 0.5rem 0' }}>
              {captchaError}
            </p>
          )}
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
        </div>
      )}

    </div>
  );
}
