import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'gincana-state.json');
const RESULTADOS_FILE = path.join(process.cwd(), 'resultados.json');

export async function GET() {
  try {
    const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf-8')) : null;
    const resultados = existsSync(RESULTADOS_FILE) ? JSON.parse(readFileSync(RESULTADOS_FILE, 'utf-8')) : [];

    // Mostrar apenas resultados do Dia 2
    const day2Results = (resultados || []).filter((r: any) => r.day === 2);

    const teams = state?.teams || [];

    const teamTotals: Record<string, { name: string; color: string; totalPoints: number; provasCount: number; wins: number }> = {};
    for (const t of teams) {
      teamTotals[t.id] = { name: t.name, color: t.color, totalPoints: 0, provasCount: 0, wins: 0 };
    }

    const provasData = day2Results.map((r: any) => {
      const provaTeams = (r.teams || []).map((t: any) => {
        const pointsAwarded = r.pointsAwarded?.[t.id] || 0;
        if (teamTotals[t.id]) {
          teamTotals[t.id].totalPoints += pointsAwarded;
          teamTotals[t.id].provasCount += 1;
          if (r.winnerId === t.id) teamTotals[t.id].wins += 1;
        }
        return {
          id: t.id, name: t.name, color: t.color,
          publicVotes: t.publicVotes || 0,
          j1: t.j1 || 0, j2: t.j2 || 0,
          pointsAwarded,
          winner: r.winnerId === t.id,
          total: pointsAwarded,
        };
      });
      return {
        provaId: r.provaId,
        provaName: r.provaName,
        points: r.points || 0,
        day: r.day || 1,
        finalized: r.finalized || false,
        winnerId: r.winnerId || null,
        backupDate: r.backupDate,
        teams: provaTeams
      };
    });

    const ranking = Object.entries(teamTotals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    const maxScore = ranking.length > 0 ? Math.max(...ranking.map(r => r.totalPoints)) : 1;

    return NextResponse.json({
      ranking,
      maxScore,
      provas: provasData,
      teams
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar dashboard.' }, { status: 500 });
  }
}
