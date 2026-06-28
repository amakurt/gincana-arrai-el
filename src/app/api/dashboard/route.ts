import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'gincana-state.json');
const RESULTADOS_FILE = path.join(process.cwd(), 'resultados.json');

export async function GET() {
  try {
    const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf-8')) : null;
    const resultados = existsSync(RESULTADOS_FILE) ? JSON.parse(readFileSync(RESULTADOS_FILE, 'utf-8')) : [];

    const teams = state?.teams || [];
    const provas = state?.provas || [];

    // Ranking geral: somar pontuação de todas as provas
    const teamTotals: Record<string, { name: string; color: string; totalScore: number; publicScore: number; juryScore: number; provasCount: number }> = {};
    for (const t of teams) {
      teamTotals[t.id] = { name: t.name, color: t.color, totalScore: 0, publicScore: 0, juryScore: 0, provasCount: 0 };
    }

    // Per-prova breakdown
    const provasData = resultados.map((r: any) => {
      const provaTeams = (r.teams || []).map((t: any) => {
        if (teamTotals[t.id]) {
          teamTotals[t.id].totalScore += t.total || 0;
          teamTotals[t.id].publicScore += t.publicScore || 0;
          teamTotals[t.id].juryScore += (t.j1 || 0) + (t.j2 || 0);
          teamTotals[t.id].provasCount += 1;
        }
        return {
          id: t.id, name: t.name, color: t.color,
          publicVotes: t.publicVotes || 0,
          publicScore: t.publicScore || 0,
          j1: t.j1 || 0, j2: t.j2 || 0,
          total: t.total || 0
        };
      });
      return { provaId: r.provaId, provaName: r.provaName, backupDate: r.backupDate, teams: provaTeams };
    });

    // Ranking ordenado
    const ranking = Object.entries(teamTotals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalScore - a.totalScore);

    const maxScore = ranking.length > 0 ? Math.max(...ranking.map(r => r.totalScore)) : 1;

    const response = {
      ranking,
      maxScore,
      provas: provasData,
      teams
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar dashboard.' }, { status: 500 });
  }
}
