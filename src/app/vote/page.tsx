"use client";

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function VotePage() {
  const { data, error, mutate } = useSWR('/api/state', fetcher);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

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

  // Escuta mudanças de status/equipes em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('db-vote-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'config' },
        () => {
          mutate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  const handleVote = async (teamId: string) => {
    if (data?.status !== 'active') return;
    if (data.singleVoteMode && hasVoted) return;
    
    const voterId = localStorage.getItem('voter_id') || '';
    
    setVotedFor(teamId);
    setHasVoted(true);
    if (data.singleVoteMode) {
      localStorage.setItem(`voted_prova_${data.currentProvaId}`, teamId);
    }

    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote', teamId, voterId })
    });
  };

  const handleVoteAgain = () => {
    setHasVoted(false);
    setVotedFor(null);
  };

  if (error) return <div className="mobile-container glass"><div style={{padding: '2rem', textAlign: 'center'}}>Erro ao carregar sistema.</div></div>;
  if (!data) return <div className="mobile-container glass"><div style={{padding: '2rem', textAlign: 'center'}} className="animate-pulse">Carregando...</div></div>;

  const isActive = data.status === 'active';
  const activeProva = data.provas.find((p: any) => p.id === data.currentProvaId);

  return (
    <div className="mobile-container" style={{ position: 'relative', overflow: 'hidden' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <img src="/logologos.png" alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 14, background: 'rgba(255,255,255,0.08)', padding: 8, boxShadow: '0 0 20px rgba(255,255,255,0.15)' }} />
      </div>

      <div className="glass" style={{ padding: '1rem', textAlign: 'center', marginBottom: '2rem', background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)' }}>
        <h2 style={{ fontSize: '1.2rem', color: isActive ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {isActive ? <span className="animate-pulse">● VOTAÇÃO ABERTA</span> : <><ShieldAlert size={18} /> {data.message}</>}
        </h2>
        {activeProva && <p style={{ marginTop: '0.5rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{activeProva.name}</p>}
      </div>

      <h1 style={{ fontSize: '2rem', textAlign: 'center' }}>Votação do Público</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
        {hasVoted ? (
          <div className="glass" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <CheckCircle2 size={64} color="#10b981" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Voto Registrado!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Seu voto para a equipe <strong>{data.teams.find((t: any) => t.id === votedFor)?.name}</strong> foi computado com sucesso.
            </p>
            {data.singleVoteMode ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Cada pessoa pode votar apenas uma vez por prova.
              </p>
            ) : (
              <button 
                className="btn" 
                onClick={handleVoteAgain}
                style={{ marginTop: '0.5rem', background: '#3b82f6', width: '100%' }}
              >
                VOTAR NOVAMENTE
              </button>
            )}
          </div>
        ) : (
          data.teams.map((team: any) => (
            <button 
              key={team.id}
              className="btn" 
              onClick={() => handleVote(team.id)}
              disabled={!isActive}
              style={{ 
                height: '80px', 
                position: 'relative', 
                background: team.color, 
                boxShadow: `0 0 20px ${team.color}50` 
              }}
            >
              {team.name.toUpperCase()}
            </button>
          ))
        )}
      </div>

    </div>
  );
}
