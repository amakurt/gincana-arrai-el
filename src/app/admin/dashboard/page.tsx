"use client";

import useSWR from "swr";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Trophy, ArrowLeft, Medal, TrendingUp } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const medalColors = ["#f59e0b", "#94a3b8", "#8b5cf6"];

export default function DashboardPage() {
  const router = useRouter();
  const { data, mutate, error } = useSWR("/api/dashboard", fetcher, { refreshInterval: 5000 });
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetch("/api/auth/check")
      .then(r => r.json())
      .then(d => {
        if (d.verified) setCheckingAuth(false);
        else window.location.href = "/login";
      })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  if (checkingAuth || !data) return null;

  const ranking = data.ranking || [];
  const provasData = data.provas || [];
  const maxScore = data.maxScore || 1;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 /> Dashboard de Resultados
        </h1>
        <button onClick={() => mutate()} className="nav-btn"><TrendingUp size={16} /> Atualizar</button>
      </div>

      {error && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', marginBottom: '1rem' }}>
          Erro ao carregar dados.
        </div>
      )}

      {/* Ranking Geral */}
      <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trophy style={{ color: '#f59e0b' }} /> Ranking Geral
        </h2>

        {ranking.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
            Nenhum resultado registrado ainda.
          </div>
        ) : (
          ranking.map((team: any, i: number) => (
            <div key={team.id} style={{ marginBottom: i < ranking.length - 1 ? '1.2rem' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 800,
                    background: i < 3 ? medalColors[i] : 'rgba(255,255,255,0.1)',
                    color: i < 3 ? 'white' : 'var(--text-secondary)'
                  }}>
                    {i < 3 ? <Medal size={14} /> : i + 1}
                  </span>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: team.color }} />
                  <strong style={{ fontSize: '1.1rem' }}>{team.name}</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    ({team.provasCount} prova{team.provasCount !== 1 ? 's' : ''})
                  </span>
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{team.totalScore}</span>
              </div>
              <div style={{
                height: '28px', background: 'rgba(255,255,255,0.08)', borderRadius: '14px',
                overflow: 'hidden', position: 'relative'
              }}>
                <div style={{
                  height: '100%', width: `${(team.totalScore / maxScore) * 100}%`,
                  minWidth: '4px',
                  background: `linear-gradient(90deg, ${team.color}88, ${team.color})`,
                  borderRadius: '14px', transition: 'width 0.6s ease',
                  display: 'flex', alignItems: 'center', paddingLeft: '8px'
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white', mixBlendMode: 'difference' }}>
                    Púb: {team.publicScore.toFixed(1)} | Júri: {team.juryScore.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Por Prova */}
      <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BarChart3 /> Resultados por Prova
      </h2>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {provasData.length === 0 ? (
          <div className="glass" style={{ padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Nenhuma prova finalizada ainda.
          </div>
        ) : (
          provasData.map((prova: any) => {
            const maxProvaScore = Math.max(...prova.teams.map((t: any) => t.total), 1);
            return (
              <div key={prova.provaId} className="glass" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>{prova.provaName}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(prova.backupDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {prova.teams.map((team: any, i: number) => (
                  <div key={team.id} style={{ marginBottom: i < prova.teams.length - 1 ? '0.8rem' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: team.color }} />
                        <strong>{team.name}</strong>
                      </div>
                      <span style={{ fontWeight: 700 }}>{team.total}</span>
                    </div>
                    <div style={{ height: '20px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(team.total / maxProvaScore) * 100}%`,
                        minWidth: '4px',
                        background: `linear-gradient(90deg, ${team.color}66, ${team.color})`,
                        borderRadius: '10px', transition: 'width 0.4s ease'
                      }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      <span>Público: {team.publicVotes} votos (nota {team.publicScore})</span>
                      <span>Júri 1: {team.j1}</span>
                      <span>Júri 2: {team.j2}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .glass {
          background: var(--bg-card);
          backdrop-filter: blur(8px);
          border: 1px solid var(--warm-wood-border);
          border-radius: 12px;
        }
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
        }
        .nav-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
