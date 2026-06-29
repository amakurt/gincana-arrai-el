"use client";

import useSWR from 'swr';
import { Play, Square, RotateCcw, AlertTriangle, Users, Trophy, Monitor, Lock, ShieldAlert, Home, RefreshCw, Edit2, Save, X, BarChart3, History, TrendingUp, Clock, CheckCircle, ThumbsUp } from 'lucide-react';
import Timer from '@/components/Timer';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminPage() {
  const router = useRouter();
  const { data, mutate, error: swrError } = useSWR('/api/state', fetcher, { refreshInterval: 3000 });
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminVerified, setAdminVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#3b82f6');
  const [newProvaName, setNewProvaName] = useState('');
  const [newProvaTimer, setNewProvaTimer] = useState(0);
  const [newProvaPoints, setNewProvaPoints] = useState(300);
  const [newProvaExternal, setNewProvaExternal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingProva, setEditingProva] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamColor, setEditTeamColor] = useState('#000000');
  const [editProvaName, setEditProvaName] = useState('');
  const [editProvaTimer, setEditProvaTimer] = useState(0);
  const [editProvaPoints, setEditProvaPoints] = useState(300);
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [showManualWinner, setShowManualWinner] = useState(false);
  const [finalizeError, setFinalizeError] = useState('');
  const [externalValues, setExternalValues] = useState<Record<string, string>>({});

  const [error, setError] = useState('');

  // Verificar se o admin já está autenticado
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => {
        if (d.verified) {
          setAdminVerified(true);
          setCheckingAuth(false);
        } else {
          window.location.href = '/login';
        }
      })
      .catch(() => { window.location.href = '/login'; });
  }, []);

  useEffect(() => {
    if (!data && !swrError) {
      const t = setTimeout(() => setLoadingTimeout(true), 8000);
      return () => clearTimeout(t);
    }
    setLoadingTimeout(false);
  }, [data, swrError]);

  if (checkingAuth) return null;

  const getTimerDuration = (d: any) => {
    if (!d?.currentProvaId || !d?.provas) return 0;
    const prova = d.provas.find((p: any) => p.id === d.currentProvaId);
    return prova?.timer || 0;
  };

  const updateState = async (updates: any) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateState', ...updates })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao atualizar');
      }
      const newData = await res.json();
      mutate(newData, false);
    } catch (e: any) {
      setError(e.message || 'Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const resetGame = async () => {
    if (!confirm('TEM CERTEZA? Isso vai apagar todos os votos e provas cadastradas no banco de dados!')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao resetar');
      }
      mutate();
    } catch (e: any) {
      setError(e.message || 'Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const startEditTeam = (team: any) => {
    setEditingTeam(team.id);
    setEditTeamName(team.name);
    setEditTeamColor(team.color);
  };

  const saveEditTeam = async (teamId: string) => {
    if (!editTeamName || loading) return;
    const updated = data.teams.map((t: any) =>
      t.id === teamId ? { ...t, name: editTeamName, color: editTeamColor } : t
    );
    await updateState({ teams: updated });
    setEditingTeam(null);
  };

  const cancelEditTeam = () => {
    setEditingTeam(null);
  };

  const startEditProva = (prova: any) => {
    setEditingProva(prova.id);
    setEditProvaName(prova.name);
    setEditProvaTimer(prova.timer || 0);
    setEditProvaPoints(prova.points || 300);
  };

  const saveEditProva = (provaId: string) => {
    if (!editProvaName) return;
    const updated = data.provas.map((p: any) =>
      p.id === provaId ? { ...p, name: editProvaName, timer: editProvaTimer || 0, points: editProvaPoints } : p
    );
    updateState({ provas: updated });
    setEditingProva(null);
  };

  const cancelEditProva = () => {
    setEditingProva(null);
  };

  const finalizeProva = async () => {
    setFinalizeLoading(true);
    setFinalizeError('');
    setShowManualWinner(false);
    try {
      if (activeProva?.externalResult) {
        const vals: Record<string, number> = {};
        for (const team of (data?.teams || [])) {
          vals[team.id] = Number(externalValues[team.id]) || 0;
        }
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'externalResult', externalValues: vals })
        });
        if (!res.ok) {
          const err = await res.json();
          setFinalizeError(err.error || 'Erro ao calcular resultado.');
          return;
        }
        const newData = await res.json();
        mutate(newData, false);
        return;
      }

      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalizeProva' })
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.details?.includes('Definir vencedor manualmente')) {
          setShowManualWinner(true);
          setFinalizeError(err.details);
        } else {
          setFinalizeError(err.error || err.details || 'Erro ao finalizar.');
        }
        return;
      }
      const newData = await res.json();
      mutate(newData, false);
    } catch (e: any) {
      setFinalizeError(e.message || 'Erro de conexão');
    } finally {
      setFinalizeLoading(false);
    }
  };

  const setManualWinner = async (winnerId: string) => {
    setFinalizeLoading(true);
    setFinalizeError('');
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'manualWinner', winnerId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao definir vencedor');
      }
      const newData = await res.json();
      mutate(newData, false);
      setShowManualWinner(false);
    } catch (e: any) {
      setFinalizeError(e.message);
    } finally {
      setFinalizeLoading(false);
    }
  };

  const reopenProva = async () => {
    setFinalizeLoading(true);
    setFinalizeError('');
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopenProva' })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao reabrir');
      }
      const newData = await res.json();
      mutate(newData, false);
    } catch (e: any) {
      setFinalizeError(e.message);
    } finally {
      setFinalizeLoading(false);
    }
  };

  if (!data) {
    const stalled = swrError || loadingTimeout;
    return (
      <div className="container" style={{ textAlign: 'center', padding: '5rem' }}>
        {stalled ? (
          <div>
            <AlertTriangle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h2 style={{ color: '#ef4444', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              {swrError ? 'Erro de conexão' : 'Servidor lento'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {swrError ? 'Não foi possível conectar ao servidor.' : 'O servidor está demorando para responder.'}
            </p>
            <button onClick={() => { setLoadingTimeout(false); mutate(); }} className="btn" style={{ background: 'var(--yellow-brazil)', color: 'var(--text-primary)', fontSize: '1rem', padding: '0.8rem 2rem', width: 'auto' }}>
              <RefreshCw size={18} style={{ marginRight: '0.4rem' }} /> Tentar novamente
            </button>
          </div>
        ) : (
          <h2 className="animate-pulse">Carregando painel admin...</h2>
        )}
      </div>
    );
  }

  if (data.error) return <div className="container" style={{ textAlign: 'center', padding: '5rem' }}><h2 style={{ color: '#ef4444' }}>Erro no servidor: {data.error}</h2></div>;

  const activeProva = (data.provas || []).find((p: any) => p.id === data.currentProvaId);

  // Tela de redirecionamento temporário
  if (!adminVerified) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '5rem' }}>
        <h2 className="animate-pulse">Redirecionando para login...</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logologos.png" alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 10, background: 'var(--logo-bg)', padding: 4, outline: '1px solid var(--logo-ring)' }} />
          <h1 style={{ margin: 0, color: 'var(--blue-brazil)' }}>Painel de Controle</h1>
        </div>
        <button 
          onClick={() => {
            document.cookie = 'admin_verified=; path=/; max-age=0';
            document.cookie = 'jurado_verified=; path=/; max-age=0';
            setAdminVerified(false);
            window.location.href = '/login';
          }} 
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
        >
          Sair do Painel
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="glass" style={{ 
        display: 'flex', 
        gap: '0.8rem', 
        padding: '0.8rem 1.2rem', 
        marginBottom: '2rem', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginRight: '0.3rem' }}>Atalhos:</span>
        
        <button onClick={() => router.push('/')} className="nav-btn"><Home size={16} /> Início</button>
        <button onClick={() => window.open('/screen', '_blank')} className="nav-btn"><Monitor size={16} /> Telão</button>
        <button onClick={() => router.push('/jurado')} className="nav-btn"><Trophy size={16} /> Júri</button>
        <button onClick={() => router.push('/admin/jurados')} className="nav-btn"><ShieldAlert size={16} /> Jurados</button>
        <button onClick={() => router.push('/admin/dashboard')} className="nav-btn"><TrendingUp size={16} /> Dashboard</button>
        <button onClick={() => router.push('/admin/resultados')} className="nav-btn"><BarChart3 size={16} /> Resultados</button>
        <button onClick={() => router.push('/admin/historico')} className="nav-btn"><History size={16} /> Histórico</button>
        <button onClick={() => router.push('/vote')} className="nav-btn"><Users size={16} /> Votos</button>

        <style dangerouslySetInnerHTML={{ __html: `
          .nav-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            background: rgba(255,255,255,0.4);
            border: 1px solid var(--warm-wood-border);
            padding: 0.5rem 1rem;
            border-radius: 10px;
            color: var(--text-primary);
            font-weight: 600;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
            outline: none;
          }
          .nav-btn:hover {
            background: rgba(255,255,255,0.7);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px var(--grass-shadow);
          }
          .nav-btn:active {
            transform: translateY(0);
          }
        ` }} />
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
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', fontWeight: 600, colorScheme: 'dark' }}
            >
              <option value="">Selecione uma prova...</option>
              {(data.provas || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                className="btn"
                style={{ background: '#10b981', flex: 1 }}
                disabled={loading || data.status === 'active' || !data.currentProvaId}
                onClick={() => updateState({ status: 'active', message: 'Votação Aberta!' })}
              >
                INICIAR VOTAÇÃO (PUBLICO)
              </button>
              {data.status === 'active' && (
                <Timer
                  timerDuration={getTimerDuration(data)}
                  timerStartedAt={data.timerStartedAt}
                  status={data.status}
                />
              )}
            </div>
            
            <button 
              className="btn"
              style={{ background: '#ef4444' }}
              disabled={loading || data.status === 'waiting'}
              onClick={() => updateState({ status: 'waiting', message: 'Votação Encerrada' })}
            >
              PARAR VOTAÇÃO
            </button>

            <button
              className="btn"
              style={{ background: '#f59e0b' }}
              disabled={loading || !data.currentProvaId}
              onClick={() => updateState({ action: 'resetVoters', provaId: data.currentProvaId })}
            >
              RESETAR VOTAÇÃO (TESTE)
            </button>
          </div>

          <hr style={{ borderColor: 'var(--border-light)', margin: '2rem 0' }} />

          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20} /> Finalizar Prova</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {activeProva?.finalized ? (
              <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <CheckCircle size={18} /> Prova Finalizada
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <strong>Vencedor:</strong> {data.teams?.find((t: any) => t.id === activeProva.winnerId)?.name || 'N/A'}
                </div>
                {activeProva.pointsAwarded && Object.entries(activeProva.pointsAwarded as Record<string, number>).map(([teamId, pts]) => (
                  <div key={teamId} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {data.teams?.find((t: any) => t.id === teamId)?.name}: <strong>{pts} pts</strong>
                  </div>
                ))}
                <button
                  className="btn"
                  style={{ background: '#f59e0b', marginTop: '0.8rem', fontSize: '0.9rem' }}
                  disabled={finalizeLoading}
                  onClick={reopenProva}
                >
                  REABRIR PROVA
                </button>
              </div>
            ) : activeProva?.externalResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Insira o valor de cada equipe (arrecadação, rifas vendidas, etc). A equipe com maior valor vence.
                </p>
                {(data.teams || []).map((team: any) => (
                  <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: team.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', minWidth: '80px' }}>{team.name}</span>
                    <input
                      type="number"
                      value={externalValues[team.id] || ''}
                      onChange={(e) => setExternalValues(prev => ({ ...prev, [team.id]: e.target.value }))}
                      min={0}
                      placeholder="Valor"
                      style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', fontSize: '0.9rem' }}
                    />
                  </div>
                ))}
                <button
                  className="btn"
                  style={{ background: '#8b5cf6' }}
                  disabled={finalizeLoading || !data.currentProvaId}
                  onClick={finalizeProva}
                >
                  {finalizeLoading ? 'CALCULANDO...' : 'CALCULAR RESULTADO'}
                </button>
                {finalizeError && <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{finalizeError}</div>}
              </div>
            ) : (
              <>
                <button
                  className="btn"
                  style={{ background: '#8b5cf6' }}
                  disabled={finalizeLoading || !data.currentProvaId}
                  onClick={finalizeProva}
                >
                  {finalizeLoading ? 'CALCULANDO...' : 'CALCULAR RESULTADO'}
                </button>

                {showManualWinner && (
                  <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.8rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ThumbsUp size={16} /> Definir Vencedor Manualmente
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                      Jurados discordaram e público empatou. Escolha o vencedor:
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {(data.teams || []).map((team: any) => (
                        <button
                          key={team.id}
                          className="btn"
                          style={{ background: team.color, flex: 1, fontSize: '0.9rem' }}
                          disabled={finalizeLoading}
                          onClick={() => setManualWinner(team.id)}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {finalizeError && !showManualWinner && (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>
                    {finalizeError}
                  </div>
                )}
              </>
            )}
          </div>


          <hr style={{ borderColor: 'var(--border-light)', margin: '2rem 0' }} />
          
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Configuração de Votos do Público</h3>
          <div className="glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Voto Único por Pessoa</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {data.singleVoteMode ? 'Cada pessoa vota apenas 1 vez por prova' : 'Cada pessoa pode votar quantas vezes quiser'}
              </div>
            </div>
            <button
              onClick={() => updateState({ singleVoteMode: !data.singleVoteMode })}
              style={{
                width: 56, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer',
                background: data.singleVoteMode ? '#10b981' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3, left: data.singleVoteMode ? 29 : 3,
                transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }} />
            </button>
          </div>

          <hr style={{ borderColor: 'var(--border-light)', margin: '2rem 0' }} />
          
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Monitor size={20} /> Controle do Telão</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn"
              style={{ background: data.viewMode === 'prova' ? '#3b82f6' : 'rgba(255,255,255,0.5)', border: '1px solid #3b82f6', fontSize: '1rem' }}
              onClick={() => updateState({ viewMode: 'prova' })}
            >
              Mostrar Prova Atual
            </button>
            <button 
              className="btn"
              style={{ background: data.viewMode === 'geral' ? '#f59e0b' : 'rgba(255,255,255,0.5)', border: '1px solid #f59e0b', fontSize: '1rem' }}
              onClick={() => updateState({ viewMode: 'geral' })}
            >
              Mostrar Ranking Geral
            </button>
          </div>

          <div className="glass" style={{ padding: '1.2rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Mostrar Notas dos Jurados no Telão</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {data.showJuryScores !== false ? 'Notas dos jurados visíveis no telão' : 'Apenas votos do público aparecem'}
              </div>
            </div>
            <button
              onClick={() => updateState({ showJuryScores: !(data.showJuryScores !== false) })}
              style={{
                width: 56, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer',
                background: data.showJuryScores !== false ? '#10b981' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3, left: data.showJuryScores !== false ? 29 : 3,
                transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }} />
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
              style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
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
                  updateState({ teams: [...(data.teams || []), { id: 't'+Date.now(), name: newTeamName, color: newTeamColor }] });
                  setNewTeamName('');
                }
              }}
              disabled={loading}
              style={{ padding: '0 1rem', borderRadius: '8px', background: 'white', color: 'black', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? '...' : 'Add'}
            </button>
          </div>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(data.teams || []).map((t: any) => (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px' }}>
                {editingTeam === t.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
                    <input
                      type="color"
                      value={editTeamColor}
                      onChange={(e) => setEditTeamColor(e.target.value)}
                      style={{ width: '36px', height: '36px', padding: 0, cursor: 'pointer', background: 'transparent', border: 'none' }}
                    />
                    <input
                      type="text"
                      value={editTeamName}
                      onChange={(e) => setEditTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditTeam(t.id)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', fontSize: '0.95rem' }}
                      autoFocus
                    />
                    <button onClick={() => saveEditTeam(t.id)} disabled={loading} style={{ background: 'transparent', color: '#10b981', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: loading ? 0.5 : 1 }}>
                      <Save size={18} />
                    </button>
                    <button onClick={cancelEditTeam} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: t.color }} />
                      {t.name}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => startEditTeam(t)}
                        disabled={loading}
                        style={{ background: 'transparent', color: '#f59e0b', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => updateState({ teams: data.teams.filter((team: any) => team.id !== t.id) })}
                        disabled={loading}
                        style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                      >
                        Remover
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Cadastro de Provas */}
        <div className="glass" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trophy /> Provas</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Nome da Prova (Ex: Dança)" 
              value={newProvaName}
              onChange={(e) => setNewProvaName(e.target.value)}
              style={{ flex: '1 1 180px', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
            />
            <input 
              type="number" 
              placeholder="Timer (seg)" 
              value={newProvaTimer}
              onChange={(e) => setNewProvaTimer(Number(e.target.value))}
              min={0}
              style={{ width: '90px', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
            />
            <input 
              type="number" 
              placeholder="Pontos" 
              value={newProvaPoints}
              onChange={(e) => setNewProvaPoints(Number(e.target.value))}
              min={0}
              style={{ width: '80px', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>pts</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={newProvaExternal} onChange={(e) => setNewProvaExternal(e.target.checked)} />
              s/ voto
            </label>
            <button 
              onClick={() => {
                if(newProvaName) {
                  updateState({ provas: [...(data.provas || []), { id: 'p'+Date.now(), name: newProvaName, timer: newProvaTimer || 0, points: newProvaPoints, externalResult: newProvaExternal, day: 1, finalized: false }] });
                  setNewProvaName('');
                  setNewProvaTimer(0);
                  setNewProvaPoints(300);
                  setNewProvaExternal(false);
                }
              }}
              disabled={loading}
              style={{ padding: '0 1rem', borderRadius: '8px', background: 'white', color: 'black', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? '...' : 'Add'}
            </button>
          </div>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(data.provas || []).map((p: any) => (
              <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px' }}>
                {editingProva === p.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={editProvaName}
                      onChange={(e) => setEditProvaName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditProva(p.id)}
                      style={{ flex: '1 1 120px', padding: '0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', fontSize: '0.95rem' }}
                      autoFocus
                    />
                    <input
                      type="number"
                      value={editProvaTimer}
                      onChange={(e) => setEditProvaTimer(Number(e.target.value))}
                      min={0}
                      style={{ width: '60px', padding: '0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
                      placeholder="seg"
                    />
                    <input
                      type="number"
                      value={editProvaPoints}
                      onChange={(e) => setEditProvaPoints(Number(e.target.value))}
                      min={0}
                      style={{ width: '60px', padding: '0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
                      placeholder="pts"
                    />
                    <button onClick={() => saveEditProva(p.id)} style={{ background: 'transparent', color: '#10b981', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Save size={18} />
                    </button>
                    <button onClick={cancelEditProva} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <span>{p.name}</span>
                      {p.timer > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><Clock size={12} /> {p.timer}s</span>}
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--blue-brazil)', background: 'rgba(37, 99, 235, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>{p.points || 300}pts</span>
                      {p.finalized && <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>✓ Finalizada</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                      <button
                        onClick={() => startEditProva(p)}
                        disabled={loading}
                        style={{ background: 'transparent', color: '#f59e0b', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      {!p.finalized && (
                        <button
                          onClick={() => updateState({ provas: data.provas.filter((prova: any) => prova.id !== p.id) })}
                          disabled={loading}
                          style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, fontSize: '0.85rem' }}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </>
                )}
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
