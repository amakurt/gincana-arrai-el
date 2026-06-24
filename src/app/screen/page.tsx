"use client";

import useSWR from 'swr';
import { motion } from 'framer-motion';
import { BookOpen, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import ShareButton from '@/components/ShareButton';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ScreenPage() {
  const { data, mutate, error: swrError } = useSWR('/api/state', fetcher, { refreshInterval: 3000 });
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!data && !swrError) setShowTimeout(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [data, swrError]);

  if (!data) {
    const hasError = swrError || showTimeout;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem' }}>
        {hasError ? (
          <>
            <h2 style={{ color: '#dc2626', fontSize: '1.2rem' }}>Não foi possível carregar os dados.</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {swrError ? 'Erro de conexão com o servidor.' : 'O servidor está demorando para responder.'}
            </p>
            <button onClick={() => { setShowTimeout(false); mutate(); }} className="btn" style={{ background: 'var(--yellow-brazil)', color: 'var(--text-primary)', fontSize: '1rem', padding: '0.8rem 2rem', width: 'auto' }}>
              <RefreshCw size={18} /> Tentar novamente
            </button>
          </>
        ) : (
          <h1 className="animate-pulse" style={{ color: 'var(--blue-brazil)' }}>CARREGANDO PLACAR...</h1>
        )}
      </div>
    );
  }

  if (data.error) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h1 style={{ color: '#dc2626' }}>ERRO: {data.error}</h1></div>;
  }

  const teams = data.teams || [];
  const provas = data.provas || [];
  const scores = data.scores || {};
  const jurados = data.jurados || [];

  const isGeral = data.viewMode === 'geral';
  const showJuryScores = data.showJuryScores !== false;
  const activeProva = provas.find((p: any) => p.id === data.currentProvaId);

  // Helper para calcular a nota de 0 a 10 baseada nos votos do público
  const calcPublicScore = (votes: number, maxVotes: number) => {
    if (maxVotes === 0) return 0;
    return Number(((votes / maxVotes) * 10).toFixed(1));
  };

  // Calcular Scores das Equipes
  let calculatedTeams = teams.map((team: any) => {
    let publicVotes = 0;
    let publicScore = 0;
    let j1 = 0;
    let j2 = 0;
    let totalScore = 0;

    if (isGeral) {
      provas.forEach((prova: any) => {
        const pScores = scores[prova.id];
        if (pScores) {
          const maxPubVotes = Math.max(...Object.values(pScores).map((s: any) => s.publicVotes || 0), 0);
          
          const teamScore = pScores[team.id] || { publicVotes: 0, j1: 0, j2: 0 };
          const pScore = calcPublicScore(teamScore.publicVotes, maxPubVotes);
          const juryScore = showJuryScores ? (teamScore.j1 || 0) + (teamScore.j2 || 0) : 0;
          
          totalScore += pScore + juryScore;
        }
      });
    } else if (activeProva) {
      const pScores = scores[activeProva.id];
      if (pScores) {
        const maxPubVotes = Math.max(...Object.values(pScores).map((s: any) => s.publicVotes || 0), 0);
        const teamScore = pScores[team.id] || { publicVotes: 0, j1: 0, j2: 0 };
        
        publicVotes = teamScore.publicVotes;
        publicScore = calcPublicScore(publicVotes, maxPubVotes);
        j1 = showJuryScores ? (teamScore.j1 || 0) : 0;
        j2 = showJuryScores ? (teamScore.j2 || 0) : 0;
        
        totalScore = publicScore + j1 + j2;
      }
    }

    return { ...team, publicVotes, publicScore, j1, j2, totalScore: Number(totalScore.toFixed(1)) };
  });

  calculatedTeams = calculatedTeams.sort((a: any, b: any) => b.totalScore - a.totalScore);
  const maxTotalScore = Math.max(...calculatedTeams.map((t: any) => t.totalScore), 1);

  return (
    <div className="screen-mode screen-padding" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '3rem 4rem' }}>
      
      <div className="screen-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
            <img src="/logologos.png" alt="Logo" className="screen-logo" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 14, background: 'var(--logo-bg)', padding: 6, outline: '2px solid var(--logo-ring)' }} />
            <h1 className="screen-title" style={{ fontSize: '4.5rem', marginBottom: 0, color: 'var(--blue-brazil)', letterSpacing: '-0.03em' }}>ARRAI-EL <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>2026</span></h1>
          </div>
          
          <div className="screen-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>
            <BookOpen size={24} color="var(--blue-brazil)" />
            <span>INSTITUTO EDUCACIONAL LOGOS</span>
            <span style={{ opacity: 0.4 }}>—</span>
            <span style={{ opacity: 0.6 }}>REDENÇÃO - CE</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="glass screen-status-card" style={{ padding: '2rem 5rem', textAlign: 'center', border: data.status === 'active' ? '3px solid #059669' : '3px solid var(--team-d)' }}>
            <div className="screen-prova-detail" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              {isGeral ? 'RANKING GERAL' : `PROVA: ${activeProva?.name || 'Nenhuma'}`}
            </div>
            <div className={`screen-status-text${data.status === 'active' ? ' animate-pulse' : ''}`} style={{ fontSize: '3.2rem', fontWeight: 900, color: data.status === 'active' ? '#059669' : 'var(--team-d)', lineHeight: 1.1 }}>
              {data.status === 'active' ? 'VOTAÇÃO ABERTA' : (data.message || '').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="screen-header-gap screen-bar-gap" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, justifyContent: 'center' }}>
        {calculatedTeams.map((team: any, index: number) => {
          const percentage = (team.totalScore / (isGeral ? Math.max(maxTotalScore, 10) : 30)) * 100;
          
          return (
            <div key={team.id} className="glass screen-bar-padding" style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', padding: '1.2rem 2.5rem' }}>
              <div className="screen-rank" style={{ width: '80px', textAlign: 'center', fontSize: '2.2rem', fontWeight: 900, color: 'var(--blue-brazil)' }}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </div>
              
              <div className="screen-team-name" style={{ width: '200px', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {team.name}
              </div>

              <div className="screen-bar" style={{ flex: 1, height: '85px', overflow: 'hidden', position: 'relative', background: 'rgba(0,0,0,0.06)', borderRadius: 14 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percentage, 100)}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                  style={{
                    height: '100%',
                    background: `linear-gradient(180deg, ${team.color}cc, ${team.color})`,
                    position: 'relative',
                    borderRadius: 14
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)' }} />
                </motion.div>
                
                {!isGeral && (
                  <div className="screen-bar-detail" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-around', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                    <span>Público: {team.publicScore} ({team.publicVotes} votos)</span>
                    {showJuryScores && (
                      <>
                        <span>{jurados[0]?.name || 'Jurado 1'}: {team.j1}</span>
                        <span>{jurados[1]?.name || 'Jurado 2'}: {team.j2}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="screen-score-width" style={{ width: '140px', textAlign: 'right' }}>
                <motion.span
                  key={team.totalScore}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="screen-team-score"
                  style={{ fontSize: '3.5rem', fontWeight: 900, color: team.color, lineHeight: 1 }}
                >
                  {team.totalScore.toFixed(1)}
                </motion.span>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em' }}>PTS</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <ShareButton url="/screen" label="Compartilhar Placar" />
      </div>
      
    </div>
  );
}
