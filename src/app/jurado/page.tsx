"use client";

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { CheckCircle, Lock, ShieldAlert } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function JuradoPage() {
  const { data, mutate } = useSWR('/api/state', fetcher, { refreshInterval: 2000 });
  const [jurado, setJurado] = useState<'j1' | 'j2' | null>(null);
  const [loadingTeam, setLoadingTeam] = useState<string | null>(null);

  // Estados de Segurança por PIN
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Verificar se o jurado já está autenticado nesta sessão do navegador
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isVerified = sessionStorage.getItem('jurado_verified');
      if (isVerified === 'true') {
        setPinVerified(true);
      }
    }
  }, []);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingPin(true);
    setPinError('');

    try {
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput, type: 'jurado' })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        sessionStorage.setItem('jurado_verified', 'true');
        setPinVerified(true);
      } else {
        setPinError(result.error || 'PIN incorreto! Tente novamente.');
      }
    } catch (err) {
      setPinError('Erro ao comunicar com o servidor.');
    } finally {
      setVerifyingPin(false);
    }
  };

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

  if (!data) return <div className="mobile-container glass"><div style={{padding: '2rem', textAlign: 'center'}}>Carregando...</div></div>;

  // Tela de Bloqueio por PIN
  if (!pinVerified) {
    return (
      <div className="mobile-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <form onSubmit={handleVerifyPin} className="glass" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6' }}>
              <Lock size={40} color="#8b5cf6" />
            </div>
          </div>
          
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>Painel do Jurado</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Área restrita aos jurados oficiais. Por favor, insira o seu PIN de acesso:</p>

          <input 
            type="password" 
            pattern="[0-9]*" 
            inputMode="numeric" 
            placeholder="Digite o PIN (Padrão: 5678)" 
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '1rem', 
              borderRadius: '12px', 
              fontSize: '1.5rem', 
              textAlign: 'center', 
              letterSpacing: '8px', 
              background: 'var(--bg-dark)', 
              color: 'white', 
              border: '1px solid var(--border-light)' 
            }}
            required
            autoFocus
          />

          {pinError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', justifyContent: 'center', fontSize: '0.9rem' }}>
              <ShieldAlert size={16} />
              <span>{pinError}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn" 
            style={{ background: '#8b5cf6', fontWeight: 'bold' }}
            disabled={verifyingPin}
          >
            {verifyingPin ? 'VERIFICANDO...' : 'ENTRAR NO PAINEL'}
          </button>
        </form>
      </div>
    );
  }

  if (!jurado) {
    return (
      <div className="mobile-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Identificação</h1>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-secondary)' }}>Selecione quem você é para o lançamento das notas:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <button className="btn" style={{ background: '#3b82f6' }} onClick={() => setJurado('j1')}>Sou o Jurado 1</button>
          <button className="btn" style={{ background: '#8b5cf6' }} onClick={() => setJurado('j2')}>Sou o Jurado 2</button>
          <button 
            onClick={() => {
              sessionStorage.removeItem('jurado_verified');
              setPinVerified(false);
              setPinInput('');
            }}
            style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sair do Painel
          </button>
        </div>
      </div>
    );
  }

  const activeProva = data.provas.find((p: any) => p.id === data.currentProvaId);

  return (
    <div className="mobile-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Acesso Autorizado</span>
          <h2 style={{ margin: 0 }}>Olá, {jurado === 'j1' ? 'Jurado 1' : 'Jurado 2'}</h2>
        </div>
        <button 
          onClick={() => setJurado(null)} 
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Voltar
        </button>
      </div>

      {!activeProva ? (
        <div className="glass" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Nenhuma prova ativa</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Aguarde o administrador iniciar a prova no painel de controle.</p>
        </div>
      ) : (
        <>
          <div className="glass" style={{ padding: '1.2rem', textAlign: 'center', marginBottom: '2rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--team-c)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Prova em Andamento</p>
            <h3 style={{ color: 'var(--team-c)', fontSize: '1.5rem', fontWeight: 900 }}>{activeProva.name}</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {data.teams.map((team: any) => {
              const currentScore = data.scores[activeProva.id]?.[team.id]?.[jurado] || 0;
              
              return (
                <div key={team.id} className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: team.color, boxShadow: `0 0 10px ${team.color}` }} />
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Equipe {team.name}</h3>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      step="0.5"
                      value={currentScore}
                      onChange={(e) => handleVote(team.id, Number(e.target.value))}
                      style={{ flex: 1, accentColor: team.color, height: '8px', cursor: 'pointer' }}
                    />
                    <div style={{ fontSize: '2rem', fontWeight: 900, width: '60px', textAlign: 'center', color: team.color }}>
                      {currentScore.toFixed(1)}
                    </div>
                  </div>
                  {loadingTeam === team.id && (
                    <span style={{ color: 'var(--team-c)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '-0.3rem' }}>
                      <CheckCircle size={14}/> Nota salva no Supabase!
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
