"use client";

import useSWR from 'swr';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert, LogOut, Star, Award, Activity, ClipboardList, RefreshCw } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

function ScoreCircle({ score, color }: { score: number; color: string }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 10;

  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--warm-wood-border)" strokeWidth="5" />
      <motion.circle
        cx="32" cy="32" r={radius}
        fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * (1 - progress) }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="38" textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontWeight="800">
        {score.toFixed(1)}
      </text>
    </svg>
  );
}

export default function JuradoPage() {
  const { data, mutate, error: swrError } = useSWR('/api/state', fetcher, { refreshInterval: 3000 });
  const [jurado, setJurado] = useState<any>(null);
  const [savingTeam, setSavingTeam] = useState<string | null>(null);
  const [localScores, setLocalScores] = useState<{ [teamId: string]: number }>({});
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (!data && !swrError) {
      const t = setTimeout(() => setLoadingTimeout(true), 8000);
      return () => clearTimeout(t);
    }
    setLoadingTimeout(false);
  }, [data, swrError]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('jurado_data');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setJurado(parsed);
          setPinVerified(true);
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (!data || !jurado) return;
    const t = data.teams || [];
    const s = data.scores || {};
    const p = data.provas || [];
    const ap = p.find((p: any) => p.id === data.currentProvaId);
    const apId = ap?.id;
    if (t.length > 0 && apId) {
      // Determina o slot (j1/j2) baseado na posição do jurado na lista ordenada
      const jurados = data.jurados || [];
      const juradoIndex = jurados.findIndex((j: any) => j.id === jurado.id);
      const mySlot = juradoIndex === 0 ? 'j1' : 'j2';
      const initialScores: any = {};
      t.forEach((team: any) => {
        initialScores[team.id] = s[apId]?.[team.id]?.[mySlot] || 0;
      });
      setLocalScores(initialScores);
    }
  }, [data, jurado]);

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
      if (response.ok && result.success && result.jurado) {
        sessionStorage.setItem('jurado_verified', 'true');
        sessionStorage.setItem('jurado_data', JSON.stringify(result.jurado));
        setJurado(result.jurado);
        setPinVerified(true);
      } else {
        setPinError(result.error || 'PIN incorreto!');
      }
    } catch {
      setPinError('Erro ao comunicar com o servidor.');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleVoteSubmit = useCallback(async (teamId: string, score: number) => {
    if (!jurado || !data) return;
    const jurados = data.jurados || [];
    const juradoIndex = jurados.findIndex((j: any) => j.id === jurado.id);
    const mySlot = juradoIndex === 0 ? 'j1' : 'j2';
    setSavingTeam(teamId);
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'juryVote', teamId, jurado: mySlot, score })
      });
      mutate();
    } catch {
      console.error('Erro ao enviar nota');
    } finally {
      setTimeout(() => setSavingTeam(null), 1200);
    }
  }, [jurado, data, mutate]);

  const handleExit = () => {
    sessionStorage.removeItem('jurado_verified');
    sessionStorage.removeItem('jurado_data');
    setJurado(null);
    setPinVerified(false);
    setPinInput('');
  };

  if (!data) {
    const stalled = swrError || loadingTimeout;
    return (
      <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        {stalled ? (
          <div style={{ textAlign: 'center' }}>
            <ShieldAlert size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h2 style={{ color: '#ef4444', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              {swrError ? 'Erro de conexão' : 'Servidor lento'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {swrError ? 'Não foi possível conectar ao servidor.' : 'O servidor está demorando para responder.'}
            </p>
            <button onClick={() => { setLoadingTimeout(false); mutate(); }} className="btn" style={{ background: 'var(--yellow-brazil)', color: 'var(--text-primary)', fontSize: '1rem', padding: '0.8rem 2rem', width: 'auto' }}>
              <RefreshCw size={18} style={{ marginRight: '0.4rem' }} /> Tentar novamente
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Activity size={48} className="animate-pulse" style={{ color: 'var(--grass-dark)', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
          </div>
        )}
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '5rem', textAlign: 'center' }}>
        <ShieldAlert size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
        <h2 style={{ color: '#ef4444', fontSize: '1rem' }}>Erro no servidor: {data.error}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Tente recarregar a página ou contate o administrador.</p>
      </div>
    );
  }

  const teams = data.teams || [];
  const scores = data.scores || {};
  const provas = data.provas || [];
  const activeProva = provas.find((p: any) => p.id === data.currentProvaId);

  if (!pinVerified) {
    return (
      <div className="mobile-container" style={{ justifyContent: 'center' }}>
        <div>
          <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <img
                src="/logologos.png"
                alt="Logo"
                style={{ width: 140, height: 140, objectFit: 'contain', margin: '0 auto 1.5rem', borderRadius: 20, background: 'var(--logo-bg)', padding: 12, outline: '1px solid var(--logo-ring)' }}
              />
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.5rem' }}>Painel do Jurado</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Área restrita. Insira o PIN de acesso para continuar.
              </p>
            </div>

            <div className="glass" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="PIN de acesso"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', fontSize: '1.5rem',
                  textAlign: 'center', letterSpacing: '12px', fontWeight: 800,
                  background: 'rgba(255,255,255,0.5)', color: 'var(--blue-brazil)',
                  border: pinError ? '1px solid #ef4444' : '1px solid var(--border-light)',
                  outline: 'none', caretColor: 'var(--blue-brazil)'
                }}
                required
                autoFocus
              />

              {pinError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.85rem', justifyContent: 'center' }}>
                  <ShieldAlert size={14} />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn"
                style={{
                  background: 'var(--grass-dark)',
                  fontWeight: 900, fontSize: '1rem', opacity: pinInput.length < 4 ? 0.5 : 1
                }}
                disabled={verifyingPin || pinInput.length < 4}
              >
                {verifyingPin ? 'VERIFICANDO...' : 'ENTRAR'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!jurado) {
    return null;
  }

  return (
    <div className="mobile-container">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logologos.png" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: 'var(--logo-bg)', padding: 4, outline: '1px solid var(--logo-ring)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Acesso Autorizado</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{jurado.name}</div>
            </div>
          </div>
          <button
            onClick={handleExit}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)',
              padding: '0.5rem 0.8rem', borderRadius: '8px', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontFamily: 'inherit'
            }}
          >
            <LogOut size={14} /> Sair
          </button>
        </div>

        {!activeProva ? (
          <div
            className="glass"
            style={{ padding: '3rem 2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <ClipboardList size={48} style={{ color: 'var(--yellow-brazil)', opacity: 0.6 }} />
            </div>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.3rem' }}>Nenhuma Prova Ativa</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Aguarde o administrador iniciar a próxima prova no painel de controle.
            </p>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              className="glass"
              style={{
                padding: '1rem 1.5rem', textAlign: 'center', marginBottom: '1.2rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <Award size={16} style={{ color: 'var(--grass-dark)' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Prova em Andamento</span>
              </div>
              <h3 style={{ color: 'var(--grass-dark)', fontSize: '1.3rem', fontWeight: 900 }}>
                {activeProva.name}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              {teams.length === 0 && (
                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Nenhuma equipe cadastrada para pontuar.
                </div>
              )}
              {teams.map((team: any) => {
                const currentScore = localScores[team.id] !== undefined
                  ? localScores[team.id]
                  : (scores[activeProva.id]?.[team.id]?.[jurado] || 0);

                return (
                  <div
                    key={team.id}
                    className="glass"
                    style={{
                      padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem',
                      borderLeft: `4px solid ${team.color}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: team.color,
                          boxShadow: `0 0 8px ${team.color}`
                        }} />
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Equipe {team.name}</span>
                      </div>
                      <ScoreCircle score={currentScore} color={team.color} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: 28 }}>0</span>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={currentScore}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLocalScores(prev => ({ ...prev, [team.id]: val }));
                          }}
                          onMouseUp={() => handleVoteSubmit(team.id, currentScore)}
                          onTouchEnd={() => handleVoteSubmit(team.id, currentScore)}
                          style={{
                            width: '100%',
                            accentColor: team.color,
                            height: 6,
                            cursor: 'pointer',
                            WebkitAppearance: 'none',
                            appearance: 'none',
                            outline: 'none',
                            background: `linear-gradient(to right, ${team.color} ${currentScore * 10}%, rgba(0,0,0,0.08) ${currentScore * 10}%)`,
                            borderRadius: 3
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: 28, textAlign: 'right' }}>10</span>
                    </div>

                    {savingTeam === team.id && (
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          color: 'var(--grass-dark)', fontSize: '0.8rem'
                        }}
                      >
                        <Award size={14} />
                        Nota salva com sucesso!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 3px solid currentColor;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type='range']::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 3px solid currentColor;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
