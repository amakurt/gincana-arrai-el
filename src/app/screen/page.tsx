"use client";

import useSWR from 'swr';
import { motion } from 'framer-motion';
import { BookOpen, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    const channel = supabase
      .channel('db-all-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, () => mutate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => mutate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => mutate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'provas' }, () => mutate())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mutate]);

  if (!data) {
    const hasError = swrError || showTimeout;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem' }}>
        {hasError ? (
          <>
            <h2 style={{ color: '#ef4444', fontSize: '1.2rem' }}>Não foi possível carregar os dados.</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {swrError ? 'Erro de conexão com o servidor.' : 'O servidor está demorando para responder.'}
            </p>
            <button onClick={() => { setShowTimeout(false); mutate(); }} className="btn" style={{ background: 'var(--glow-yellow)', color: 'black', fontSize: '1rem', padding: '0.8rem 2rem', width: 'auto' }}>
              <RefreshCw size={18} /> Tentar novamente
            </button>
          </>
        ) : (
          <h1 className="animate-pulse">CARREGANDO PLACAR...</h1>
        )}
      </div>
    );
  }

  if (data.error) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h1 style={{ color: '#ef4444' }}>ERRO: {data.error}</h1></div>;
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at top, #18181b, #09090b)', padding: '4rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
            <img src="/logologos.png" alt="Logo" style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 18, background: 'rgba(255,255,255,0.08)', padding: 8, boxShadow: '0 0 30px rgba(255,255,255,0.2)' }} />
            <h1 className="gradient-text" style={{ fontSize: '4.5rem', marginBottom: 0 }}>ARRAI-EL <span style={{ color: 'var(--glow-yellow)' }}>2026</span></h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            <div className="glass" style={{ padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={24} color="var(--glow-blue)" />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white', letterSpacing: '1px' }}>INSTITUTO EDUCACIONAL LOGOS</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>REDENÇÃO - CE</div>
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: '2rem 4rem', textAlign: 'center', background: data.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', border: data.status === 'active' ? '1px solid var(--team-c)' : undefined }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            {isGeral ? 'RANKING GERAL' : `PROVA: ${activeProva?.name || 'Nenhuma'}`}
          </h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: data.status === 'active' ? 'var(--team-c)' : 'white' }} className={data.status === 'active' ? 'animate-pulse' : ''}>
            {data.status === 'active' ? 'VOTAÇÃO ABERTA' : (data.message || '').toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, justifyContent: 'center' }}>
        {calculatedTeams.map((team: any, index: number) => {
          // Progress bar baseada na maior nota (para a barra não ficar sempre em 100%)
          const percentage = (team.totalScore / (isGeral ? Math.max(maxTotalScore, 10) : 30)) * 100;
          
          return (
            <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div style={{ width: '80px', textAlign: 'right', fontSize: '2rem', fontWeight: 900, color: 'var(--text-secondary)' }}>
                #{index + 1}
              </div>
              
              <div style={{ width: '200px', fontSize: '2rem', fontWeight: 800 }}>
                {team.name}
              </div>

              {/* Progress Bar Container */}
              <div className="glass" style={{ flex: 1, height: '80px', overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percentage, 100)}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                  style={{
                    height: '100%',
                    background: team.color,
                    boxShadow: `0 0 20px ${team.color}`,
                    position: 'relative'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)' }} />
                </motion.div>
                
                {/* Notas Detalhadas se for visão de Prova */}
                {!isGeral && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-around', color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold' }}>
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

              {/* Total Score */}
              <div style={{ width: '150px', textAlign: 'right' }}>
                <motion.span
                  key={team.totalScore}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  style={{ fontSize: '3.5rem', fontWeight: 900, color: team.color }}
                >
                  {team.totalScore.toFixed(1)}
                </motion.span>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>PTS</div>
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
}
