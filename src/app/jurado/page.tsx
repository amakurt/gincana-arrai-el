"use client";

import useSWR from 'swr';
import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function JuradoPage() {
  const { data, mutate } = useSWR('/api/state', fetcher, { refreshInterval: 2000 });
  const [jurado, setJurado] = useState<'j1' | 'j2' | null>(null);
  const [loadingTeam, setLoadingTeam] = useState<string | null>(null);

  if (!data) return <div className="mobile-container glass"><div style={{padding: '2rem', textAlign: 'center'}}>Carregando...</div></div>;

  if (!jurado) {
    return (
      <div className="mobile-container">
        <h1 style={{ textAlign: 'center' }}>Painel do Jurado</h1>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-secondary)' }}>Selecione quem você é:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="btn" style={{ background: '#3b82f6' }} onClick={() => setJurado('j1')}>Sou o Jurado 1</button>
          <button className="btn" style={{ background: '#8b5cf6' }} onClick={() => setJurado('j2')}>Sou o Jurado 2</button>
        </div>
      </div>
    );
  }

  const activeProva = data.provas.find((p: any) => p.id === data.currentProvaId);

  const handleVote = async (teamId: string, score: number) => {
    setLoadingTeam(teamId);
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'juryVote', teamId, jurado, score })
    });
    mutate();
    setTimeout(() => setLoadingTeam(null), 500);
  };

  return (
    <div className="mobile-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Olá, {jurado === 'j1' ? 'Jurado 1' : 'Jurado 2'}</h2>
        <button onClick={() => setJurado(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>Sair</button>
      </div>

      {!activeProva ? (
        <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3>Nenhuma prova ativa</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Aguarde o administrador iniciar a prova.</p>
        </div>
      ) : (
        <>
          <div className="glass" style={{ padding: '1rem', textAlign: 'center', marginBottom: '2rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--team-c)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Prova Atual</p>
            <h3 style={{ color: 'var(--team-c)' }}>{activeProva.name}</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.teams.map((team: any) => {
              const currentScore = data.scores[activeProva.id]?.[team.id]?.[jurado] || 0;
              
              return (
                <div key={team.id} className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: team.color }} />
                    <h3 style={{ margin: 0 }}>{team.name}</h3>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      step="1"
                      value={currentScore}
                      onChange={(e) => handleVote(team.id, Number(e.target.value))}
                      style={{ flex: 1, accentColor: team.color }}
                    />
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>
                      {currentScore}
                    </div>
                  </div>
                  {loadingTeam === team.id && <span style={{ color: 'var(--team-c)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={14}/> Salvo!</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
