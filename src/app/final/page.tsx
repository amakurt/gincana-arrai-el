"use client";

import useSWR from 'swr';
import { Trophy, Medal, CheckCircle, Printer } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function FinalPage() {
  const { data } = useSWR('/api/state', fetcher, { refreshInterval: 3000 });

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 className="animate-pulse" style={{ color: 'var(--blue-brazil)' }}>CARREGANDO...</h1>
    </div>
  );

  const teams = data.teams || [];
  const provas = (data.provas || []).filter((p: any) => !(p.finalized && (p.day === 1 || p.day === undefined)));
  const scores = data.scores || {};
  const finalizedProvas = provas.filter((p: any) => p.finalized);
  const allFinalized = provas.length > 0 && provas.every((p: any) => p.finalized);

  const teamTotals: Record<string, { name: string; color: string; total: number; wins: number }> = {};
  for (const t of teams) {
    teamTotals[t.id] = { name: t.name, color: t.color, total: 0, wins: 0 };
  }

  for (const prova of finalizedProvas) {
    if (prova.pointsAwarded) {
      for (const [teamId, pts] of Object.entries(prova.pointsAwarded)) {
        if (teamTotals[teamId]) {
          teamTotals[teamId].total += pts as number;
          if (prova.winnerId === teamId) teamTotals[teamId].wins += 1;
        }
      }
    }
  }

  const ranking = Object.entries(teamTotals)
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.total - a.total);

  const champion = ranking[0];
  const maxScore = Math.max(...ranking.map(r => r.total), 1);

  function medalEmoji(pos: number) {
    if (pos === 0) return '🥇';
    if (pos === 1) return '🥈';
    return '🥉';
  }

  function championColor(rank: number) {
    if (rank === 0) return '#f59e0b';
    if (rank === 1) return '#94a3b8';
    return '#8b5cf6';
  }

  return (
    <div className="final-page">
      <div className="final-print-header">
        <img src="/logologos.png" alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} />
        <div>
          <h1>ARRAI-EL 2026</h1>
          <p>Instituto Educacional Logos — Redenção-CE</p>
        </div>
      </div>

      <div className="final-champion">
        {champion && (
          <>
            <div className="final-crown">👑</div>
            <div style={{ fontSize: '3.5rem' }}>{medalEmoji(0)}</div>
            <h2 className="final-champion-name" style={{ color: champion.color }}>
              {champion.name}
            </h2>
            <div className="final-champion-score">
              {champion.total} PTS
            </div>
            <div className="final-champion-sub">
              {champion.wins} {champion.wins === 1 ? 'vitória' : 'vitórias'}
            </div>
          </>
        )}
      </div>

      {!allFinalized && (
        <div className="final-warning">
          ⚠️ {provas.length - finalizedProvas.length} prova(s) ainda não finalizada(s)
        </div>
      )}

      <div className="final-ranking">
        <h3><Trophy size={20} /> Classificação Final</h3>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Equipe</th>
              <th>Pontos</th>
              <th>Vitórias</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((team, i) => (
              <tr key={team.id} className={i === 0 ? 'final-row-champion' : ''}>
                <td className="final-rank" style={{ color: championColor(i) }}>
                  {i < 3 ? medalEmoji(i) : `#${i + 1}`}
                </td>
                <td className="final-team-name" style={{ color: team.color }}>
                  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: team.color, marginRight: 8, verticalAlign: 'middle' }} />
                  {team.name}
                </td>
                <td className="final-points">{team.total}</td>
                <td className="final-wins">{team.wins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {finalizedProvas.length > 0 && (
        <div className="final-provas">
          <h3><Medal size={20} /> Detalhamento por Prova</h3>
          {finalizedProvas.map((prova: any) => {
            const isExternal = prova.externalResult;
            const sorted = teams
              .map((t: any) => {
                const s = scores[prova.id]?.[t.id] || {};
                return {
                  ...t,
                  pts: prova.pointsAwarded?.[t.id] || 0,
                  publicVotes: s.publicVotes || 0,
                  j1pick: s.j1 === 1,
                  j2pick: s.j2 === 1,
                  externalValue: s.externalValue || 0
                };
              })
              .sort((a: any, b: any) => b.pts - a.pts);
            const jury1 = data.jurados?.[0];
            const jury2 = data.jurados?.[1];
            const jury1Label = data.showJuradoNames && jury1?.name ? jury1.name : 'Júri 1';
            const jury2Label = data.showJuradoNames && jury2?.name ? jury2.name : 'Júri 2';
            return (
              <div key={prova.id} className="final-prova-card">
                <div className="final-prova-header">
                  <div>
                    <strong>{prova.name}</strong>
                    <span className="final-prova-points">{prova.points} pts</span>
                  </div>
                  {prova.winnerId && (
                    <span className="final-prova-winner" style={{ color: teams.find((t: any) => t.id === prova.winnerId)?.color }}>
                      <CheckCircle size={16} /> {teams.find((t: any) => t.id === prova.winnerId)?.name}
                    </span>
                  )}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Equipe</th>
                      {isExternal ? (
                        <th style={{ textAlign: 'center' }}>{data.showExternalValues ? (prova.externalUnit === 'R$' ? 'Valor Arrecadado' : 'Quantidade') : 'Valor Arrecadado'}</th>
                      ) : (
                        <>
                          <th style={{ textAlign: 'center' }}>Público</th>
                          <th style={{ textAlign: 'center' }}>{jury1Label}</th>
                          <th style={{ textAlign: 'center' }}>{jury2Label}</th>
                        </>
                      )}
                      <th style={{ textAlign: 'center' }}>Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((team: any) => (
                      <tr key={team.id} className={team.id === prova.winnerId ? 'final-row-winner' : ''}>
                        <td style={{ color: team.color, fontWeight: 600 }}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: team.color, marginRight: 6, verticalAlign: 'middle' }} />
                          {team.name}
                          {team.id === prova.winnerId && <span style={{ marginLeft: 6 }}>🏆</span>}
                        </td>
                        {isExternal ? (
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {data.showExternalValues
                              ? (prova.externalUnit === 'R$'
                                ? `R$ ${team.externalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : String(team.externalValue))
                              : '●●●●'
                            }
                          </td>
                        ) : (
                          <>
                            <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{team.publicVotes}</td>
                            <td style={{ textAlign: 'center' }}>{team.j1pick ? '✓' : '—'}</td>
                            <td style={{ textAlign: 'center' }}>{team.j2pick ? '✓' : '—'}</td>
                          </>
                        )}
                        <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                          {team.pts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <div className="final-footer">
        <p>Arrai-el 2026 — Instituto Educacional Logos, Redenção-CE</p>
        <p>Resultado gerado em {new Date().toLocaleString('pt-BR')}</p>
      </div>

      <div className="no-print" style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button className="btn" onClick={() => window.print()} style={{ background: 'var(--blue-brazil)', display: 'inline-block', width: 'auto', padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
          <Printer size={20} /> GERAR PDF / IMPRIMIR
        </button>
      </div>

      <style>{`
        .final-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
          font-family: 'Helvetica Neue', Arial, sans-serif;
        }
        .final-print-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e2e8f0;
        }
        .final-print-header h1 {
          margin: 0;
          font-size: 1.8rem;
          color: var(--blue-brazil);
        }
        .final-print-header p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .final-champion {
          text-align: center;
          padding: 2rem 1rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02));
          border-radius: 20px;
          border: 2px solid rgba(245,158,11,0.2);
        }
        .final-crown {
          font-size: 2.5rem;
          margin-bottom: 0.3rem;
        }
        .final-champion-name {
          font-size: 2.5rem;
          font-weight: 900;
          margin: 0.5rem 0;
          letter-spacing: -0.03em;
        }
        .final-champion-score {
          font-size: 3rem;
          font-weight: 900;
          color: #f59e0b;
        }
        .final-champion-sub {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-top: 0.3rem;
        }
        .final-warning {
          text-align: center;
          padding: 1rem;
          background: rgba(234,179,8,0.1);
          border: 1px solid rgba(234,179,8,0.3);
          border-radius: 10px;
          color: #a16207;
          font-weight: 700;
          margin-bottom: 2rem;
        }
        .final-ranking h3, .final-provas h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--blue-brazil);
          margin-bottom: 1rem;
          font-size: 1.3rem;
        }
        .final-ranking table, .final-provas table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5rem;
        }
        .final-ranking th, .final-provas th {
          text-align: left;
          padding: 0.6rem 0.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
          border-bottom: 2px solid #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .final-ranking td, .final-provas td {
          padding: 0.8rem 0.5rem;
          border-bottom: 1px solid #e2e8f0;
          font-size: 1rem;
        }
        .final-rank {
          font-size: 1.3rem;
          text-align: center;
          width: 50px;
        }
        .final-team-name {
          font-weight: 700;
        }
        .final-points {
          font-weight: 900;
          font-size: 1.3rem;
          color: var(--text-primary);
        }
        .final-wins {
          color: var(--text-secondary);
        }
        .final-row-champion {
          background: rgba(245,158,11,0.05);
        }
        .final-row-winner {
          background: rgba(16,185,129,0.04);
        }
        .final-prova-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 1.2rem;
          margin-bottom: 1rem;
        }
        .final-prova-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.8rem;
          font-size: 1rem;
        }
        .final-prova-points {
          margin-left: 0.8rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          background: rgba(0,0,0,0.05);
          padding: 0.15rem 0.6rem;
          border-radius: 6px;
        }
        .final-prova-winner {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .final-footer {
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.8rem;
          margin-top: 3rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }
        .final-footer p { margin: 0.2rem 0; }

        @media print {
          .no-print { display: none !important; }
          .final-page { padding: 0; max-width: 100%; }
          .final-champion { break-inside: avoid; }
          .final-prova-card { break-inside: avoid; }
          body { background: white; color: black; }
          .final-ranking th, .final-provas th { color: #666; }
          .final-points { color: black; }
          .final-prova-points { color: #666; }
          .final-warning { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
          .final-rank { color: #666 !important; }
          .final-row-champion { background: #fffbeb; }
          .final-row-winner { background: #f0fdf4; }
          .final-prova-card { border: 1px solid #ddd; }
          .final-crown { font-size: 2.5rem; }
        }
      `}</style>
    </div>
  );
}
