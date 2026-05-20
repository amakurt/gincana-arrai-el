"use client";

import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function VotePage() {
  const { data, error } = useSWR('/api/state', fetcher, { refreshInterval: 1000 });
  const [votedFor, setVotedFor] = useState<string | null>(null);

  const handleVote = async (teamId: string) => {
    if (data?.status !== 'active') return;
    
    setVotedFor(teamId);
    setTimeout(() => setVotedFor(null), 1000);

    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote', teamId })
    });
  };

  if (error) return <div className="mobile-container glass"><div style={{padding: '2rem', textAlign: 'center'}}>Erro ao carregar sistema.</div></div>;
  if (!data) return <div className="mobile-container glass"><div style={{padding: '2rem', textAlign: 'center'}} className="animate-pulse">Carregando...</div></div>;

  const isActive = data.status === 'active';
  const activeProva = data.provas.find((p: any) => p.id === data.currentProvaId);

  return (
    <div className="mobile-container" style={{ position: 'relative', overflow: 'hidden' }}>
      
      <div className="glass" style={{ padding: '1rem', textAlign: 'center', marginBottom: '2rem', background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)' }}>
        <h2 style={{ fontSize: '1.2rem', color: isActive ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {isActive ? <span className="animate-pulse">● VOTAÇÃO ABERTA</span> : <><ShieldAlert size={18} /> {data.message}</>}
        </h2>
        {activeProva && <p style={{ marginTop: '0.5rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{activeProva.name}</p>}
      </div>

      <h1 style={{ fontSize: '2rem', textAlign: 'center' }}>Votação do Público</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
        {data.teams.map((team: any) => (
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
            {votedFor === team.id && (
              <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'absolute', background: 'white', borderRadius: '50%', width: '40px', height: '40px' }} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {votedFor && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.9)',
              color: '#000',
              padding: '1rem 2rem',
              borderRadius: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 'bold',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              zIndex: 100
            }}
          >
            <CheckCircle2 color="#10b981" /> Voto Registrado!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
