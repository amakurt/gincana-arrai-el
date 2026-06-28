"use client";

import useSWR from 'swr';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert, LogOut, Award, Activity, ClipboardList, RefreshCw, ThumbsUp, CheckCircle } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
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

export default function JuradoPage() {
  const { data, mutate, error: swrError } = useSWR('/api/state', fetcher, { refreshInterval: 3000 });
  const [jurado, setJurado] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [hasPicked, setHasPicked] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [juradoName, setJuradoName] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileToken = useRef<string | null>(null);

  useEffect(() => {
    const checkTurnstile = () => {
      if (window.turnstile && turnstileContainer.current && !turnstileWidgetId.current) {
        window.turnstile.render(turnstileContainer.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
          callback: (token: string) => { turnstileToken.current = token; },
          'expired-callback': () => { turnstileToken.current = null; },
          'error-callback': () => { turnstileToken.current = null; },
        });
      }
    };
    const interval = setInterval(checkTurnstile, 200);
    setTimeout(() => clearInterval(interval), 10000);
    return () => { clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!data && !swrError) {
      const t = setTimeout(() => setLoadingTimeout(true), 8000);
      return () => clearTimeout(t);
    }
    setLoadingTimeout(false);
  }, [data, swrError]);

  const getCookie = (cname: string) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cname}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const verified = getCookie('jurado_verified') === 'true';
      if (verified) {
        const jid = getCookie('jurado_id');
        const jname = getCookie('jurado_name');
        if (jid && jname) {
          setJurado({ id: jid, name: decodeURIComponent(jname) });
          setPinVerified(true);
        }
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
      const jurados = data.jurados || [];
      const juradoIndex = jurados.findIndex((j: any) => j.id === jurado.id);
      const mySlot = juradoIndex === 0 ? 'j1' : 'j2';
      const pickedTeam = t.find((team: any) => s[apId]?.[team.id]?.[mySlot] === 1);
      if (pickedTeam) {
        setSelectedTeam(pickedTeam.id);
        setHasPicked(true);
      } else {
        setSelectedTeam(null);
        setHasPicked(false);
      }
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
        body: JSON.stringify({ name: juradoName, pin: pinInput, type: 'jurado' })
      });
      const result = await response.json();
      if (response.ok && result.success && result.jurado) {
        setJurado(result.jurado);
        setPinVerified(true);
      } else {
        setPinError(result.error || 'Nome ou PIN incorreto!');
      }
    } catch {
      setPinError('Erro ao comunicar com o servidor.');
    } finally {
      setVerifyingPin(false);
    }
  };

  const sound = useSound();

  const getTurnstileToken = useCallback(() => {
    return Promise.resolve(turnstileToken.current);
  }, []);

  const handlePickWinner = useCallback(async (teamId: string) => {
    if (!jurado || !data) return;
    setCaptchaError('');

    const cfToken = await getTurnstileToken();
    if (!cfToken) {
      setCaptchaError('Aguardando verificação de segurança...');
      return;
    }

    const jurados = data.jurados || [];
    const juradoIndex = jurados.findIndex((j: any) => j.id === jurado.id);
    const mySlot = juradoIndex === 0 ? 'j1' : 'j2';
    setSaving(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'juryVote', teamId, jurado: mySlot, cfToken, juradoName: jurado.name })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao enviar escolha.' }));
        setCaptchaError(err.error || 'Erro ao enviar escolha.');
        return;
      }
      sound.juryVote();
      setSelectedTeam(teamId);
      setHasPicked(true);
      mutate();
    } catch {
      setCaptchaError('Erro ao comunicar com o servidor.');
    } finally {
      setSaving(false);
      if (window.turnstile && turnstileContainer.current) {
        window.turnstile.reset(turnstileContainer.current);
      }
      turnstileToken.current = null;
    }
  }, [jurado, data, mutate]);

  const handleExit = () => {
    document.cookie = 'jurado_verified=; path=/; max-age=0';
    document.cookie = 'jurado_id=; path=/; max-age=0';
    document.cookie = 'jurado_name=; path=/; max-age=0';
    setJurado(null);
    setPinVerified(false);
    setPinInput('');
    setJuradoName('');
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
  const isFinalized = activeProva?.finalized;

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
                placeholder="Seu nome"
                value={juradoName}
                onChange={(e) => setJuradoName(e.target.value)}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', fontSize: '1.1rem',
                  textAlign: 'center', fontWeight: 600,
                  background: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)',
                  border: pinError ? '1px solid #ef4444' : '1px solid var(--border-light)',
                  outline: 'none'
                }}
                required
                autoFocus
              />
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
                  fontWeight: 900, fontSize: '1rem', opacity: (!juradoName || pinInput.length < 4) ? 0.5 : 1
                }}
                disabled={verifyingPin || !juradoName || pinInput.length < 4}
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

        {!activeProva || data.status !== 'active' || activeProva?.externalResult ? (
          <div
            className="glass"
            style={{ padding: '3rem 2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <ClipboardList size={48} style={{ color: 'var(--yellow-brazil)', opacity: 0.6 }} />
            </div>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.3rem' }}>
              {activeProva?.externalResult ? 'Prova sem Votação' : activeProva ? 'Votação Pausada' : 'Nenhuma Prova Ativa'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {activeProva?.externalResult
                ? `"${activeProva.name}" não precisa de votação de jurados. O resultado será definido pelo administrador.`
                : activeProva
                  ? `A prova "${activeProva.name}" está selecionada, mas a votação está pausada.`
                  : 'Aguarde o administrador iniciar a próxima prova no painel de controle.'}
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
              {activeProva.timer > 0 && (
                <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'center' }}>
                  <Timer timerDuration={activeProva.timer} timerStartedAt={data.timerStartedAt} status={data.status} />
                </div>
              )}
            </div>

            {isFinalized ? (
              <div className="glass" style={{ padding: '2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Prova Finalizada</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Esta prova já foi encerrada e o resultado foi calculado.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <ThumbsUp size={24} style={{ color: 'var(--yellow-brazil)' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.3rem 0' }}>Escolha o Time VENCEDOR</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Selecione qual equipe teve o melhor desempenho nesta prova</p>
                </div>

                {teams.length === 0 && (
                  <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Nenhuma equipe cadastrada.
                  </div>
                )}
                {teams.map((team: any) => {
                  const isSelected = selectedTeam === team.id;
                  return (
                    <button
                      key={team.id}
                      onClick={() => handlePickWinner(team.id)}
                      disabled={saving}
                      style={{
                        padding: '2rem 1.5rem',
                        borderRadius: '16px',
                        border: isSelected ? `3px solid ${team.color}` : '2px solid var(--border-light)',
                        background: isSelected ? `${team.color}22` : 'var(--bg-card)',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        opacity: saving ? 0.6 : 1,
                        transition: 'all 0.3s ease',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: team.color,
                        boxShadow: isSelected ? `0 0 12px ${team.color}` : 'none'
                      }} />
                      <span style={{
                        fontSize: '1.8rem',
                        fontWeight: 900,
                        color: isSelected ? team.color : 'var(--text-primary)'
                      }}>
                        Equipe {team.name}
                      </span>
                      {isSelected && (
                        <CheckCircle size={28} color={team.color} />
                      )}
                    </button>
                  );
                })}

                {hasPicked && selectedTeam && (
                  <div style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    textAlign: 'center',
                    color: 'var(--grass-dark)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    <CheckCircle size={20} />
                    Seu voto foi registrado! Você escolheu <strong>{teams.find((t: any) => t.id === selectedTeam)?.name}</strong>
                  </div>
                )}
              </div>
            )}

            {captchaError && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', margin: '0.5rem 0 0' }}>
                {captchaError}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
              <div ref={turnstileContainer} style={{ width: 300, height: 65 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
