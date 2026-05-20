"use client";

import useSWR from 'swr';
import { Play, Square, RotateCcw, AlertTriangle, Users, Trophy, Monitor, Lock, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminPage() {
  const { data, mutate } = useSWR('/api/state', fetcher, { refreshInterval: 1000 });
  const [loading, setLoading] = useState(false);

  // Estados de Segurança por PIN
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#3b82f6');
  const [newProvaName, setNewProvaName] = useState('');

  // Verificar se o admin já está autenticado nesta sessão do navegador
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isVerified = sessionStorage.getItem('admin_verified');
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
        body: JSON.stringify({ pin: pinInput, type: 'admin' })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        sessionStorage.setItem('admin_verified', 'true');
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

  const updateState = async (updates: any) => {
    setLoading(true);
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateState', ...updates })
    });
    mutate();
    setLoading(false);
  };

  const resetGame = async () => {
    if (!confirm('TEM CERTEZA? Isso vai apagar todos os votos e provas cadastradas no banco de dados!')) return;
    setLoading(true);
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' })
    });
    mutate();
    setLoading(false);
  };

  if (!data) return <div className="container" style={{ textAlign: 'center', padding: '5rem' }}><h2 className="animate-pulse">Carregando painel admin...</h2></div>;

  // Tela de Bloqueio por PIN
  if (!pinVerified) {
    return (
      <div className="mobile-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <form onSubmit={handleVerifyPin} className="glass" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--team-d)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--team-d)' }}>
              <Lock size={40} color="var(--team-d)" />
            </div>
          </div>
          
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>Painel Admin</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Área restrita aos organizadores. Por favor, insira o PIN de acesso:</p>

          <input 
            type="password" 
            pattern="[0-9]*" 
            inputMode="numeric" 
            placeholder="Digite o PIN (Padrão: 1234)" 
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
            style={{ background: 'var(--team-d)', fontWeight: 'bold' }}
            disabled={verifyingPin}
          >
            {verifyingPin ? 'VERIFICANDO...' : 'ENTRAR NO PAINEL'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="gradient-text" style={{ margin: 0 }}>Painel de Controle</h1>
        <button 
          onClick={() => {
            sessionStorage.removeItem('admin_verified');
            setPinVerified(false);
            setPinInput('');
          }} 
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
        >
          Sair do Painel
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Controle da Gincana (O que está ativo) */}
        <div className="glass" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Play /> Controle Ao Vivo</h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Prova Ativa agora:</label>
            <select 
              value={data.currentProvaId || ''} 
              onChange={(e) => updateState({ currentProvaId: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-light)' }}
            >
              <option value="">Selecione uma prova...</option>
              {data.provas.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              className="btn"
              style={{ background: '#10b981' }}
              disabled={loading || data.status === 'active' || !data.currentProvaId}
              onClick={() => updateState({ status: 'active', message: 'Votação Aberta!' })}
            >
              INICIAR VOTAÇÃO (PUBLICO)
            </button>
            
            <button 
              className="btn"
              style={{ background: '#ef4444' }}
              disabled={loading || data.status === 'waiting'}
              onClick={() => updateState({ status: 'waiting', message: 'Votação Pausada/Encerrada' })}
            >
              PARAR VOTAÇÃO
            </button>
          </div>

          <hr style={{ borderColor: 'var(--border-light)', margin: '2rem 0' }} />
          
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Monitor size={20} /> Controle do Telão</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn"
              style={{ background: data.viewMode === 'prova' ? '#3b82f6' : 'var(--bg-dark)', border: '1px solid #3b82f6', fontSize: '1rem' }}
              onClick={() => updateState({ viewMode: 'prova' })}
            >
              Mostrar Prova Atual
            </button>
            <button 
              className="btn"
              style={{ background: data.viewMode === 'geral' ? '#f59e0b' : 'var(--bg-dark)', border: '1px solid #f59e0b', fontSize: '1rem' }}
              onClick={() => updateState({ viewMode: 'geral' })}
            >
              Mostrar Ranking Geral
            </button>
          </div>
        </div>

        {/* Cadastro de Equipes */}
        <div className="glass" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users /> Equipes</h2>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <input 
              type="text" 
              placeholder="Nome da Equipe" 
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-light)' }}
            />
            <input 
              type="color" 
              value={newTeamColor}
              onChange={(e) => setNewTeamColor(e.target.value)}
              style={{ width: '50px', height: '45px', padding: '0', cursor: 'pointer', background: 'transparent', border: 'none' }}
            />
            <button 
              onClick={() => {
                if(newTeamName) {
                  updateState({ teams: [...data.teams, { id: 't'+Date.now(), name: newTeamName, color: newTeamColor }] });
                  setNewTeamName('');
                }
              }}
              style={{ padding: '0 1rem', borderRadius: '8px', background: 'white', color: 'black', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}
            >
              Add
            </button>
          </div>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.teams.map((t: any) => (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: t.color }} />
                  {t.name}
                </div>
                <button 
                  onClick={() => updateState({ teams: data.teams.filter((team: any) => team.id !== t.id) })}
                  style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Cadastro de Provas */}
        <div className="glass" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trophy /> Provas</h2>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <input 
              type="text" 
              placeholder="Nome da Prova (Ex: Dança)" 
              value={newProvaName}
              onChange={(e) => setNewProvaName(e.target.value)}
              style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-light)' }}
            />
            <button 
              onClick={() => {
                if(newProvaName) {
                  updateState({ provas: [...data.provas, { id: 'p'+Date.now(), name: newProvaName }] });
                  setNewProvaName('');
                }
              }}
              style={{ padding: '0 1rem', borderRadius: '8px', background: 'white', color: 'black', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}
            >
              Add
            </button>
          </div>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.provas.map((p: any) => (
              <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px' }}>
                {p.name}
                <button 
                  onClick={() => updateState({ provas: data.provas.filter((prova: any) => prova.id !== p.id) })}
                  style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>

          <hr style={{ borderColor: 'var(--border-light)', margin: '2rem 0' }} />
            
          <button 
            className="btn"
            style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}
            disabled={loading}
            onClick={resetGame}
          >
            <RotateCcw /> RESETAR TUDO (PERIGO)
          </button>
        </div>

      </div>
    </div>
  );
}
