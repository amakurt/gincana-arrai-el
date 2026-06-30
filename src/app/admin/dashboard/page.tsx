"use client";

import useSWR from "swr";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Trophy, ArrowLeft, Medal, TrendingUp, Download, Printer } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const medalColors = ["#f59e0b", "#94a3b8", "#8b5cf6"];

  function exportCSV(data: any) {
  if (!data?.ranking?.length && !data?.provas?.length) return;
  let csv = '\uFEFF';
  csv += 'Ranking Geral\n';
  csv += 'Posição;Equipe;Pontos Totais;Vitórias;Provas\n';
  data.ranking.forEach((t: any, i: number) => {
    csv += `${i + 1};${t.name};${t.totalPoints};${t.wins};${t.provasCount}\n`;
  });
  csv += '\n';
  (data.provas || []).forEach((p: any) => {
    csv += `\nProva: ${p.provaName} (${p.points} pts)\n`;
    csv += 'Posição;Equipe;Votos Público;Júri 1;Júri 2;Pontos Recebidos;Vencedor\n';
    const sorted = [...(p.teams || [])].sort((a: any, b: any) => b.pointsAwarded - a.pointsAwarded);
    sorted.forEach((t: any, i: number) => {
      csv += `${i + 1};${t.name};${t.publicVotes};${t.j1};${t.j2};${t.pointsAwarded};${t.winner ? 'Sim' : 'Não'}\n`;
    });
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `resultados-gincana-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

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
        <button onClick={() => exportCSV(data)} className="nav-btn"><Download size={16} /> Exportar CSV</button>
        <button onClick={() => window.print()} className="nav-btn" style={{ background: 'var(--yellow-brazil)', color: 'var(--text-primary)', fontWeight: 700 }}><Printer size={16} /> Imprimir</button>
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
                    ({team.wins} vitória{team.wins !== 1 ? 's' : ''} · {team.provasCount} prova{team.provasCount !== 1 ? 's' : ''})
                  </span>
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{team.totalPoints} pts</span>
              </div>
              <div style={{
                height: '28px', background: 'rgba(255,255,255,0.08)', borderRadius: '14px',
                overflow: 'hidden', position: 'relative'
              }}>
                <div style={{
                  height: '100%', width: `${(team.totalPoints / maxScore) * 100}%`,
                  minWidth: '4px',
                  background: `linear-gradient(90deg, ${team.color}88, ${team.color})`,
                  borderRadius: '14px', transition: 'width 0.6s ease',
                  display: 'flex', alignItems: 'center', paddingLeft: '8px'
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white', mixBlendMode: 'difference' }}>
                    {team.totalPoints} pts
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="print-only" style={{ display: 'none', textAlign: 'center', marginBottom: '6pt', borderBottom: '0.5pt solid #999', paddingBottom: '4pt' }}>
        <strong style={{ fontSize: '10pt' }}>INSTITUTO EDUCACIONAL LOGOS — REDENÇÃO-CE</strong><br />
        <span style={{ fontSize: '7pt' }}>Dashboard de Resultados — Arrai-el 2026</span>
        <span style={{ fontSize: '6.5pt' }}> | {new Date().toLocaleString('pt-BR')}</span>
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
            const maxProvaScore = Math.max(...prova.teams.map((t: any) => t.pointsAwarded), 1);
            return (
              <div key={prova.provaId} className="glass" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>{prova.provaName} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({prova.points} pts)</span></h3>
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
                        {team.winner && (
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>✓ Vencedor</span>
                        )}
                      </div>
                      <span style={{ fontWeight: 700 }}>{team.pointsAwarded} pts</span>
                    </div>
                    <div style={{ height: '20px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(team.pointsAwarded / maxProvaScore) * 100}%`,
                        minWidth: '4px',
                        background: `linear-gradient(90deg, ${team.color}66, ${team.color})`,
                        borderRadius: '10px', transition: 'width 0.4s ease'
                      }} />
                    </div>
                    <div className="print-hide-votes" style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      <span>Público: {team.publicVotes} votos</span>
                      <span>Júri 1: {team.j1 === 1 ? '✓' : '—'}</span>
                      <span>Júri 2: {team.j2 === 1 ? '✓' : '—'}</span>
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
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: white !important; color: black !important; margin: 0; padding: 0; }
          .nav-btn, button, input, select, .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-hide-votes { display: none !important; }
          h1, h1 svg, h2, h2 svg { font-size: 12pt !important; color: #1a3a5c !important; margin: 0 0 4pt 0 !important; }
          h1 svg, h2 svg { display: none; }
          .glass {
            background: white !important; border: 0.5pt solid #ddd !important;
            backdrop-filter: none !important; padding: 6pt 8pt !important;
            margin-bottom: 6pt !important; break-inside: avoid;
          }
          .glass h3 { font-size: 8pt !important; margin: 0 0 3pt 0 !important; }
          strong { font-size: 7pt !important; }
          span { font-size: 6pt !important; }
          [style*="font-size"] { font-size: 6pt !important; }
          [style*="height: 28px"] { height: 12px !important; }
          [style*="height: 20px"] { height: 10px !important; }
          [style*="padding: 2rem"] { padding: 6pt !important; }
          [style*="margin-bottom: 1.2rem"] { margin-bottom: 4pt !important; }
          [style*="gap: 1.5rem"] { gap: 6pt !important; }
          [style*="gap: 0.6rem"] { gap: 2pt !important; }
          [style*="gap: 0.4rem"] { gap: 2pt !important; }
          [style*="max-width: 1000px"] { max-width: 100% !important; padding: 6pt 8pt !important; }
          @page { margin: 8pt 10pt; size: A4 portrait; }
        }
      `}</style>
    </div>
  );
}
