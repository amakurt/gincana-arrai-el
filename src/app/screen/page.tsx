"use client";

import useSWR from 'swr';
import { motion } from 'framer-motion';
import { BookOpen, RefreshCw, Trophy, CheckCircle } from 'lucide-react';
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

  // Determine jury picks for current active prova
  const getJuryPicks = (provaId: string) => {
    const pScores = scores[provaId];
    if (!pScores) return { j1Pick: null, j2Pick: null };
    let j1Pick: string | null = null;
    let j2Pick: string | null = null;
    for (const team of teams) {
      const s = pScores[team.id] || {};
      if (s.j1 === 1) j1Pick = team.id;
      if (s.j2 === 1) j2Pick = team.id;
    }
    return { j1Pick, j2Pick };
  };

  // Calcular pontos das equipes
  let calculatedTeams = teams.map((team: any) => {
    let totalPoints = 0;
    let publicVotes = 0;
    let j1Pick = false;
    let j2Pick = false;

    if (isGeral) {
      provas.forEach((prova: any) => {
        if (prova.finalized && prova.pointsAwarded) {
          totalPoints += prova.pointsAwarded[team.id] || 0;
        }
      });
    } else if (activeProva) {
      if (activeProva.finalized && activeProva.pointsAwarded) {
        totalPoints = activeProva.pointsAwarded[team.id] || 0;
      }

      const pScores = scores[activeProva.id];
      if (pScores) {
        const teamScore = pScores[team.id] || {};
        publicVotes = teamScore.publicVotes || 0;
        if (teamScore.j1 === 1) j1Pick = true;
        if (teamScore.j2 === 1) j2Pick = true;
      }
    }

    return { ...team, totalPoints, publicVotes, j1Pick, j2Pick };
  });

  calculatedTeams = calculatedTeams.sort((a: any, b: any) => b.totalPoints - a.totalPoints);
  const maxTotalPoints = Math.max(...calculatedTeams.map((t: any) => t.totalPoints), 1);

  return (
    <div className="screen-mode screen-padding" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '3rem 4rem' }}>
      
      <div className="screen-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
            <img src="/logologos.png" alt="Logo" className="screen-logo" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 14, background: 'var(--logo-bg)', padding: 6, outline: '2px solid var(--logo-ring)' }} />
            <h1 className="screen-title" style={{ fontSize: '4.5rem', marginBottom: 0, color: 'var(--blue-brazil)', letterSpacing: '-0.03em' }}>ARRAI-EL <span style={{ color: 'var(--yellow-brazil)', fontWeight: 900 }}>2026</span></h1>
          </div>
          
          <div className="screen-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, fontSize: '1.1rem' }}>
            <BookOpen size={24} color="var(--blue-brazil)" />
            <span style={{ color: 'var(--blue-brazil)' }}>INSTITUTO EDUCACIONAL LOGOS</span>
            <span style={{ color: 'var(--blue-brazil)', opacity: 0.3 }}>—</span>
            <span style={{ color: 'var(--blue-brazil)', opacity: 0.65 }}>REDENÇÃO - CE</span>
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
            {!isGeral && activeProva?.finalized && activeProva?.winnerId && (
              <div style={{ marginTop: '0.5rem', fontSize: '1.8rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <CheckCircle size={28} /> VENCEDOR: {teams.find((t: any) => t.id === activeProva.winnerId)?.name || ''}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="screen-header-gap screen-bar-gap" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, justifyContent: 'center' }}>
        {calculatedTeams.map((team: any, index: number) => {
          const maxScore = isGeral ? Math.max(maxTotalPoints, 10) : (activeProva?.finalized ? maxTotalPoints : Math.max(maxTotalPoints, 10));
          const percentage = maxScore > 0 ? (team.totalPoints / maxScore) * 100 : 0;

          const juryPicks = !isGeral && activeProva ? getJuryPicks(activeProva.id) : { j1Pick: null, j2Pick: null };
          
          return (
            <div key={team.id} className="glass screen-bar-padding" style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', padding: '1.2rem 2.5rem' }}>
              <div className="screen-rank" style={{ width: '80px', textAlign: 'center', fontSize: '2.2rem', fontWeight: 900, color: 'var(--blue-brazil)' }}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : `#${index + 1}`}
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
                
                {!isGeral && !activeProva?.finalized && (
                  <div className="screen-bar-detail" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-around', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                    <span>Público: {team.publicVotes} votos</span>
                    {showJuryScores && (
                      <>
                        <span>{jurados[0]?.name || 'Jurado 1'}: {juryPicks.j1Pick === team.id ? '✓' : '—'}</span>
                        <span>{jurados[1]?.name || 'Jurado 2'}: {juryPicks.j2Pick === team.id ? '✓' : '—'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="screen-score-width" style={{ width: '160px', textAlign: 'right' }}>
                <motion.span
                  key={team.totalPoints}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="screen-team-score"
                  style={{ fontSize: '3.5rem', fontWeight: 900, color: team.color, lineHeight: 1 }}
                >
                  {team.totalPoints}
                </motion.span>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em' }}>PTS</div>
              </div>
            </div>
          );
        })}
      </div>

      {!isGeral && activeProva?.finalized && activeProva?.pointsAwarded && (
        <div className="glass" style={{ marginTop: '2rem', padding: '1.5rem 2.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--blue-brazil)', marginBottom: '1rem' }}>
            <Trophy size={32} style={{ color: 'var(--yellow-brazil)' }} /> Pontuação Final
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem' }}>
            {teams.map((team: any) => (
              <div key={team.id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: team.color, marginBottom: '0.3rem' }}>{team.name}</div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: team.color }}>
                  {activeProva.pointsAwarded[team.id] || 0}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                  {team.id === activeProva.winnerId ? 'VENCEDOR (100%)' : '2º LUGAR (50%)'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <ShareButton url="/screen" label="Compartilhar Placar" />
      </div>
      
    </div>
  );
}
