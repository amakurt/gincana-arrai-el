import { NextResponse } from 'next/server';
import { supabase, checkSupabaseAvailable } from '@/lib/supabase';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const ratelimits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 3000;
function checkRateLimit(key: string, maxReq: number): boolean {
  const now = Date.now();
  const entry = ratelimits.get(key);
  if (!entry || now > entry.resetAt) {
    ratelimits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= maxReq) return false;
  entry.count++;
  return true;
}
function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ratelimits) {
    if (now > v.resetAt) ratelimits.delete(k);
  }
}, 300000);

const ALLOWED_HOSTS = new Set([
  'localhost:3000',
  'www.institutoeducacionallogos.online',
  'institutoeducacionallogos.online',
  'hetzner.institutoeducacionallogos.online',
  '137.131.160.171',
  '23.88.58.41',
]);

function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (origin) {
    try {
      const u = new URL(origin);
      if (ALLOWED_HOSTS.has(u.host) || ALLOWED_HOSTS.has(u.hostname)) return true;
    } catch {}
  }
  if (referer) {
    try {
      const u = new URL(referer);
      if (ALLOWED_HOSTS.has(u.host) || ALLOWED_HOSTS.has(u.hostname)) return true;
    } catch {}
  }
  return false;
}

function checkAdminAuth(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader.includes('admin_verified=true');
}

function getCookieValue(request: Request, name: string): string | null {
  const cookies = request.headers.get('cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const VOTED_VOTERS = new Map<string, Set<string>>();

function hasVoterVoted(provaId: string, voterId: string): boolean {
  return VOTED_VOTERS.get(provaId)?.has(voterId) ?? false;
}

function markVoterVoted(provaId: string, voterId: string) {
  if (!VOTED_VOTERS.has(provaId)) VOTED_VOTERS.set(provaId, new Set());
  VOTED_VOTERS.get(provaId)!.add(voterId);
}

function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPin(pin: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return pin === stored;
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(String(pin), salt, 1000, 64, 'sha512').toString('hex');
  return hash === verify;
}

function hashJuradoPins(jurados: any[]): any[] {
  return jurados.map((j: any) => {
    if (j.pin && !j.pin.includes(':')) {
      return { ...j, pin: hashPin(j.pin) };
    }
    return j;
  });
}

const STATE_FILE = path.join(process.cwd(), 'gincana-state.json');
const RESULTADOS_FILE = path.join(process.cwd(), 'resultados.json');
const HISTORICO_FILE = path.join(process.cwd(), 'votacoes-historico.jsonl');

function appendHistorico(entry: any) {
  try {
    writeFileSync(HISTORICO_FILE, JSON.stringify(entry) + '\n', { flag: 'a' });
  } catch {}
}

function readStateFromFile(): any {
  try {
    if (!existsSync(STATE_FILE)) return null;
    const raw = readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch { return null; }
}

function writeStateToFile(data: any) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

function readResultadosFile(): any[] {
  try {
    if (!existsSync(RESULTADOS_FILE)) return [];
    return JSON.parse(readFileSync(RESULTADOS_FILE, 'utf-8'));
  } catch { return []; }
}

function writeResultadosFile(data: any[]) {
  try {
    writeFileSync(RESULTADOS_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

function saveSnapshot(fileData: any, provas: any[], teams: any[], scores: any) {
  const provaId = fileData.currentProvaId;
  if (!provaId || !scores[provaId]) return;

  const prova = provas.find((p: any) => p.id === provaId);
  if (!prova) return;

  const pScores = scores[provaId];

  const teamResults = teams.map((team: any) => {
    const teamScore = pScores[team.id] || { publicVotes: 0, j1: 0, j2: 0 };
    return {
      id: team.id, name: team.name, color: team.color,
      publicVotes: teamScore.publicVotes || 0,
      publicScore: teamScore.publicVotes || 0,
      j1: teamScore.j1 || 0,
      j2: teamScore.j2 || 0,
      total: (prova.pointsAwarded?.[team.id] || 0),
      winnerPick: teamScore.j1 === 1 || teamScore.j2 === 1,
    };
  });

  const resultados = readResultadosFile();
  const idx = resultados.findIndex((r: any) => r.provaId === provaId);
  const entry = {
    provaId, provaName: prova.name,
    points: prova.points || 0,
    day: prova.day || 1,
    finalized: prova.finalized || false,
    winnerId: prova.winnerId || null,
    pointsAwarded: prova.pointsAwarded || {},
    teams: teamResults,
    backupDate: new Date().toISOString()
  };
  if (idx >= 0) {
    resultados[idx] = entry;
  } else {
    resultados.push(entry);
  }
  writeResultadosFile(resultados);
}

function getJuryPicks(provaId: string, scores: any, teams: any[]) {
  const pScores = scores[provaId];
  if (!pScores) return { j1Pick: null, j2Pick: null };

  let j1Pick: string | null = null;
  let j2Pick: string | null = null;

  for (const team of teams) {
    const s = pScores[team.id] || { publicVotes: 0, j1: 0, j2: 0 };
    if (s.j1 === 1) j1Pick = team.id;
    if (s.j2 === 1) j2Pick = team.id;
  }

  return { j1Pick, j2Pick };
}

function getPublicVotes(provaId: string, scores: any, teams: any[]) {
  const pScores = scores[provaId];
  if (!pScores) return {};
  const result: Record<string, number> = {};
  for (const team of teams) {
    result[team.id] = pScores[team.id]?.publicVotes || 0;
  }
  return result;
}

function getAudienceWinner(provaId: string, scores: any, teams: any[]) {
  const pScores = scores[provaId];
  if (!pScores) return null;
  const pubVotes = teams.map((t: any) => ({ id: t.id, votes: pScores[t.id]?.publicVotes || 0 }));
  if (pubVotes.length !== 2) return null;
  if (pubVotes[0].votes > pubVotes[1].votes) return pubVotes[0].id;
  if (pubVotes[1].votes > pubVotes[0].votes) return pubVotes[1].id;
  return null;
}

function calculateProvaPoints(prova: any, j1Pick: string | null, j2Pick: string | null, teams: any[], scores: any) {
  const provaPoints = prova.points || 0;
  const provaId = prova.id;
  const pointsAwarded: Record<string, number> = {};

  // Score de cada jurado: 300 para o escolhido, 150 para o outro
  function juryScore(pick: string | null, teamId: string): number {
    if (!pick) return 150; // jurado não votou = neutro
    return pick === teamId ? 300 : 150;
  }

  // Média dos jurados para cada equipe
  const juryAvgs: Record<string, number> = {};
  let totalJuryAvg = 0;
  for (const team of teams) {
    const avg = (juryScore(j1Pick, team.id) + juryScore(j2Pick, team.id)) / 2;
    juryAvgs[team.id] = avg;
    totalJuryAvg += avg;
  }

  // Votos do público
  const publicVotes = getPublicVotes(provaId, scores, teams);
  const totalPublicVotes = Object.values(publicVotes).reduce((a: number, b: number) => a + b, 0);

  // Calcular pontos
  let totalPoints = 0;
  const teamPoints: Record<string, number> = {};
  const teamIds = teams.map((t: any) => t.id);

  for (const team of teams) {
    const juryRatio = totalJuryAvg > 0 ? juryAvgs[team.id] / totalJuryAvg : 0.5;
    const publicRatio = totalPublicVotes > 0 ? (publicVotes[team.id] || 0) / totalPublicVotes : 0.5;
    const finalRatio = 0.7 * juryRatio + 0.3 * publicRatio;
    const pts = Math.round(finalRatio * provaPoints);
    teamPoints[team.id] = pts;
    totalPoints += pts;
  }

  // Ajustar diferença de arredondamento
  const diff = provaPoints - totalPoints;
  if (diff !== 0 && teams.length > 0) {
    teamPoints[teamIds[teamIds.length - 1]] += diff;
  }

  // Determinar vencedor
  let winnerId: string | null = null;
  let maxPts = -1;
  for (const team of teams) {
    pointsAwarded[team.id] = teamPoints[team.id];
    if (teamPoints[team.id] > maxPts) {
      maxPts = teamPoints[team.id];
      winnerId = team.id;
    }
  }

  // Se houver empate, usar o voto do público como desempate
  if (winnerId) {
    const tiedTeams = teams.filter((t: any) => teamPoints[t.id] === maxPts);
    if (tiedTeams.length > 1) {
      const pVotes = getPublicVotes(provaId, scores, teams);
      winnerId = tiedTeams.reduce((a: any, b: any) =>
        (pVotes[a.id] || 0) >= (pVotes[b.id] || 0) ? a : b
      ).id;
    }
  }

  return { pointsAwarded, winnerId };
}

export async function GET() {
  const fileData = readStateFromFile();
  const base = fileData ? {
    status: fileData.status || 'waiting',
    viewMode: fileData.viewMode || 'prova',
    currentProvaId: fileData.currentProvaId || '',
    message: fileData.message || '',
    teams: fileData.teams || [],
    provas: fileData.provas || [],
    jurados: fileData.jurados || [],
    singleVoteMode: fileData.singleVoteMode !== undefined ? fileData.singleVoteMode : true,
    showJuryScores: fileData.showJuryScores !== undefined ? fileData.showJuryScores : true,
    showJuradoNames: fileData.showJuradoNames !== undefined ? fileData.showJuradoNames : false,
    showExternalValues: fileData.showExternalValues !== undefined ? fileData.showExternalValues : false,
    scores: fileData.scores || {},
    timerStartedAt: fileData.timerStartedAt || null,
    voterResetAt: fileData.voterResetAt || 0
  } : null;

  if (!base) {
    return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 });
  }

  if (await checkSupabaseAvailable()) {
    try {
      const { data: dbScores } = await supabase.from('scores').select('*');
      if (dbScores) {
        const scores: any = {};
        dbScores.forEach((row: any) => {
          if (!scores[row.prova_id]) scores[row.prova_id] = {};
          scores[row.prova_id][row.team_id] = {
            publicVotes: row.public_votes || 0,
            j1: Number(row.j1) || 0,
            j2: Number(row.j2) || 0
          };
        });
        base.scores = scores;
      }
    } catch {}
  }

  return NextResponse.json(base);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const ip = getClientIp(request);
    if ((body.action === 'vote' || body.action === 'juryVote') && !checkRateLimit(`${ip}:${body.action}`, 2)) {
      return NextResponse.json({ error: 'Muitas requisições. Aguarde alguns segundos.' }, { status: 429 });
    }
    const adminActions = ['updateState', 'finalizeProva', 'externalResult', 'manualWinner', 'reopenProva', 'reset', 'resetVoters', 'newSegment', 'duplicateForDay2'];
    if (adminActions.includes(body.action)) {
      if (!checkOrigin(request)) {
        return NextResponse.json({ error: 'Requisição rejeitada: origem inválida.' }, { status: 403 });
      }
      if (!checkAdminAuth(request)) {
        return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
      }
    }

    if (body.action === 'vote' || body.action === 'juryVote') {
      const secret = process.env.TURNSTILE_SECRET_KEY;
      const cfToken = body.cfToken || '';
      if (cfToken && secret && secret.length > 0) {
        try {
          const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(cfToken)}&remoteip=${encodeURIComponent(ip)}`
          });
          const result = await verify.json();
          if (!result.success) {
            return NextResponse.json({ error: 'Verificação de segurança falhou. Tente novamente.' }, { status: 403 });
          }
        } catch {
          return NextResponse.json({ error: 'Erro ao validar verificação de segurança.' }, { status: 500 });
        }
      }
    }

    // Ação: Registrar Voto do Público
    if (body.action === 'vote') {
      const fileData = readStateFromFile();
      if (fileData && body.teamId && fileData.currentProvaId) {
        const provaId = fileData.currentProvaId;
        const voterId = body.voterId || '';

        if (fileData.singleVoteMode && voterId) {
          if (hasVoterVoted(provaId, voterId)) {
            return NextResponse.json({ error: 'Você já votou nesta prova.' }, { status: 429 });
          }
          markVoterVoted(provaId, voterId);
        }

        if (!fileData.scores) fileData.scores = {};
        if (!fileData.scores[provaId]) fileData.scores[provaId] = {};
        if (!fileData.scores[provaId][body.teamId]) fileData.scores[provaId][body.teamId] = { publicVotes: 0, j1: 0, j2: 0 };
        fileData.scores[provaId][body.teamId].publicVotes = (fileData.scores[provaId][body.teamId].publicVotes || 0) + 1;
        writeStateToFile(fileData);

        appendHistorico({
          timestamp: new Date().toISOString(),
          type: 'public',
          provaId,
          teamId: body.teamId,
          voterId: voterId || 'anon'
        });

        if (await checkSupabaseAvailable()) {
          try {
            await supabase.rpc('increment_public_vote', {
              p_prova_id: provaId,
              p_team_id: body.teamId
            });
          } catch {}
        }
      }
      return GET();
    }

    // Ação: Escolha Binária do Jurado (qual time venceu)
    if (body.action === 'juryVote') {
      if (body.teamId && body.jurado) {
        const fileData = readStateFromFile();
        if (fileData && fileData.currentProvaId) {
          const pId = fileData.currentProvaId;
          const teams = fileData.teams || [];
          const jurados = fileData.jurados || [];

          // Verificar slot do jurado contra cookie
          const juradoIdFromCookie = getCookieValue(request, 'jurado_id');
          if (juradoIdFromCookie) {
            const juradoIndex = jurados.findIndex((j: any) => j.id === juradoIdFromCookie);
            if (juradoIndex >= 0) {
              const expectedSlot = juradoIndex === 0 ? 'j1' : 'j2';
              if (body.jurado !== expectedSlot) {
                return NextResponse.json({ error: 'Slot de jurado inválido.' }, { status: 403 });
              }
            }
          }

          if (!fileData.scores) fileData.scores = {};
          if (!fileData.scores[pId]) fileData.scores[pId] = {};

          // Set j1=1 for chosen team, j1=0 for other team
          for (const team of teams) {
            if (!fileData.scores[pId][team.id]) fileData.scores[pId][team.id] = { publicVotes: 0, j1: 0, j2: 0 };
            fileData.scores[pId][team.id][body.jurado] = team.id === body.teamId ? 1 : 0;
          }
          writeStateToFile(fileData);

          appendHistorico({
            timestamp: new Date().toISOString(),
            type: 'jury_pick',
            provaId: pId,
            jurado: body.jurado,
            pickedTeamId: body.teamId,
            juradoName: body.juradoName || ''
          });

          if (await checkSupabaseAvailable()) {
            try {
              for (const team of teams) {
                const { data: existing } = await supabase
                  .from('scores')
                  .select('id')
                  .eq('prova_id', pId)
                  .eq('team_id', team.id)
                  .single();

                const value = team.id === body.teamId ? 1 : 0;
                if (existing) {
                  await supabase.from('scores').update({ [body.jurado]: value }).eq('id', existing.id);
                } else {
                  await supabase.from('scores').insert({ prova_id: pId, team_id: team.id, [body.jurado]: value });
                }
              }
            } catch {}
          }
        }
      }
      return GET();
    }

    // Ação: Finalizar Prova (com votação de jurados + público)
    if (body.action === 'finalizeProva') {
      const fileData = readStateFromFile();
      if (!fileData) return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 });

      const provaId = body.provaId || fileData.currentProvaId;
      if (!provaId) return NextResponse.json({ error: 'Nenhuma prova selecionada.' }, { status: 400 });

      const provas = fileData.provas || [];
      const provaIdx = provas.findIndex((p: any) => p.id === provaId);
      if (provaIdx < 0) return NextResponse.json({ error: 'Prova não encontrada.' }, { status: 400 });

      const prova = provas[provaIdx];
      if (prova.externalResult) {
        return NextResponse.json({ error: 'Use "externalResult" para provas sem votação.' }, { status: 400 });
      }

      const teams = fileData.teams || [];
      const scores = fileData.scores || {};

      const { j1Pick, j2Pick } = getJuryPicks(provaId, scores, teams);
      const audienceWinner = getAudienceWinner(provaId, scores, teams);

      if (!j1Pick && !j2Pick) {
        return NextResponse.json({
          error: 'Nenhum jurado votou.',
          details: 'Aguardar votos dos jurados.'
        }, { status: 400 });
      }

      const { pointsAwarded, winnerId } = calculateProvaPoints(prova, j1Pick, j2Pick, teams, scores);

      provas[provaIdx] = { ...prova, finalized: true, winnerId, pointsAwarded };
      fileData.provas = provas;
      writeStateToFile(fileData);

      saveSnapshot(fileData, fileData.provas, fileData.teams, fileData.scores);

      appendHistorico({
        timestamp: new Date().toISOString(),
        type: 'finalize', provaId, winnerId, pointsAwarded, j1Pick, j2Pick, audienceWinner,
      });

      return readJsonState();
    }

    // Ação: Prova sem votação (Barracas/Rifas) — admin insere valores numéricos
    if (body.action === 'externalResult') {
      const fileData = readStateFromFile();
      if (!fileData) return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 });

      const provaId = body.provaId || fileData.currentProvaId;
      if (!provaId) return NextResponse.json({ error: 'Nenhuma prova selecionada.' }, { status: 400 });
      if (!body.externalValues || typeof body.externalValues !== 'object') {
        return NextResponse.json({ error: 'Informe os valores de cada equipe.' }, { status: 400 });
      }

      const provas = fileData.provas || [];
      const provaIdx = provas.findIndex((p: any) => p.id === provaId);
      if (provaIdx < 0) return NextResponse.json({ error: 'Prova não encontrada.' }, { status: 400 });

      const prova = provas[provaIdx];
      const teams = fileData.teams || [];

      const points = prova.points || 0;
      const pointsAwarded: Record<string, number> = {};
      for (const team of teams) {
        pointsAwarded[team.id] = 0;
      }

      const vals = body.externalValues as Record<string, number>;

      if (prova.winnerTakesAll) {
        // Winner-takes-all: maior valor leva todos os pontos
        let maxVal = -1;
        let winnerTeamId: string | null = null;
        for (const team of teams) {
          const v = Math.max(0, vals[team.id] || 0);
          if (v > maxVal) {
            maxVal = v;
            winnerTeamId = team.id;
          }
        }
        const tiedTeams = teams.filter((t: any) => Math.max(0, vals[t.id] || 0) === maxVal && maxVal >= 0);
        if (tiedTeams.length > 1 && maxVal > 0) {
          // Empate: dividir igualmente
          const splitPts = Math.round(points / tiedTeams.length);
          for (const team of tiedTeams) {
            pointsAwarded[team.id] = splitPts;
          }
          const sum = Object.values(pointsAwarded).reduce((a: number, b: number) => a + b, 0);
          if (sum !== points && tiedTeams.length > 0) {
            pointsAwarded[tiedTeams[tiedTeams.length - 1].id] += points - sum;
          }
        } else if (winnerTeamId && maxVal > 0) {
          // Vencedor leva tudo
          pointsAwarded[winnerTeamId] = points;
        }
      } else {
        // Distribuir pontos proporcionalmente
        let totalVal = 0;
        for (const team of teams) {
          totalVal += Math.max(0, vals[team.id] || 0);
        }

        if (totalVal > 0) {
          let totalPts = 0;
          const teamIds = teams.map((t: any) => t.id);
          for (let i = 0; i < teamIds.length; i++) {
            const tid = teamIds[i];
            const rawPts = (Math.max(0, vals[tid] || 0) / totalVal) * points;
            const rounded = i < teamIds.length - 1 ? Math.round(rawPts) : points - totalPts;
            pointsAwarded[tid] = rounded;
            totalPts += rounded;
          }
        } else {
          for (const team of teams) {
            pointsAwarded[team.id] = Math.round(points / teams.length);
          }
          const sum = Object.values(pointsAwarded).reduce((a: number, b: number) => a + b, 0);
          if (sum !== points && teams.length > 0) {
            pointsAwarded[teams[teams.length - 1].id] += points - sum;
          }
        }
      }

      // Determinar vencedor (maior valor)
      let winnerId: string | null = null;
      let maxVal = -1;
      for (const team of teams) {
        const v = vals[team.id];
        if (v !== undefined && v > maxVal) {
          maxVal = v;
          winnerId = team.id;
        }
      }

      provas[provaIdx] = { ...prova, finalized: true, winnerId, pointsAwarded };
      fileData.provas = provas;

      if (!fileData.scores) fileData.scores = {};
      if (!fileData.scores[provaId]) fileData.scores[provaId] = {};
      for (const team of teams) {
        if (!fileData.scores[provaId][team.id]) fileData.scores[provaId][team.id] = { publicVotes: 0, j1: 0, j2: 0 };
        fileData.scores[provaId][team.id].externalValue = vals[team.id] || 0;
      }

      writeStateToFile(fileData);
      saveSnapshot(fileData, fileData.provas, fileData.teams, fileData.scores);

      appendHistorico({
        timestamp: new Date().toISOString(),
        type: 'externalResult', provaId, winnerId, externalValues: vals, pointsAwarded,
      });

      return readJsonState();
    }

    // Ação: Definir Vencedor Manual (fallback raro — jurados discordam e público empatou)
    if (body.action === 'manualWinner') {
      const fileData = readStateFromFile();
      if (!fileData) return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 });

      const provaId = body.provaId || fileData.currentProvaId;
      if (!provaId) return NextResponse.json({ error: 'Nenhuma prova selecionada.' }, { status: 400 });
      if (!body.winnerId) return NextResponse.json({ error: 'Selecione um vencedor.' }, { status: 400 });

      const provas = fileData.provas || [];
      const provaIdx = provas.findIndex((p: any) => p.id === provaId);
      if (provaIdx < 0) return NextResponse.json({ error: 'Prova não encontrada.' }, { status: 400 });

      const teams = fileData.teams || [];
      const prova = provas[provaIdx];
      const pointsAwarded: Record<string, number> = {};
      for (const team of teams) {
        pointsAwarded[team.id] = team.id === body.winnerId ? (prova.points || 0) : 0;
      }

      provas[provaIdx] = { ...prova, finalized: true, winnerId: body.winnerId, pointsAwarded };
      fileData.provas = provas;
      writeStateToFile(fileData);
      saveSnapshot(fileData, fileData.provas, fileData.teams, fileData.scores);

      appendHistorico({
        timestamp: new Date().toISOString(),
        type: 'manualWinner', provaId, winnerId: body.winnerId, pointsAwarded,
      });

      return readJsonState();
    }

    // Ação: Reabrir Prova Finalizada
    if (body.action === 'reopenProva') {
      const fileData = readStateFromFile();
      if (!fileData) return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 });

      const provaId = body.provaId || fileData.currentProvaId;
      if (!provaId) return NextResponse.json({ error: 'Nenhuma prova selecionada.' }, { status: 400 });

      const provas = fileData.provas || [];
      const provaIdx = provas.findIndex((p: any) => p.id === provaId);
      if (provaIdx < 0) return NextResponse.json({ error: 'Prova não encontrada.' }, { status: 400 });

      provas[provaIdx] = {
        ...provas[provaIdx],
        finalized: false,
        winnerId: null,
        pointsAwarded: {},
      };
      fileData.provas = provas;
      writeStateToFile(fileData);

      appendHistorico({
        timestamp: new Date().toISOString(),
        type: 'reopen',
        provaId,
      });

      return readJsonState();
    }

    // Ação: Resetar Votação (limpa VOTED_VOTERS para testes)
    if (body.action === 'resetVoters') {
      const fileData = readStateFromFile();
      if (!fileData) return readJsonState();
      const provaId = body.provaId || fileData.currentProvaId;
      if (provaId) {
        VOTED_VOTERS.delete(provaId);
      } else {
        VOTED_VOTERS.clear();
      }
      fileData.voterResetAt = Date.now();
      writeStateToFile(fileData);
      return readJsonState();
    }

    // Ação: Atualizar Estado Global
    if (body.action === 'updateState') {
      const oldData = readStateFromFile() || {};
      const fileData = { ...oldData };
      if (body.status !== undefined) {
        fileData.status = body.status;
        if (body.status === 'active') fileData.timerStartedAt = Date.now();
      }
      if (body.viewMode !== undefined) fileData.viewMode = body.viewMode;
      if (body.currentProvaId !== undefined) fileData.currentProvaId = body.currentProvaId || null;
      if (body.message !== undefined) fileData.message = body.message;
      if (body.singleVoteMode !== undefined) fileData.singleVoteMode = body.singleVoteMode;
      if (body.showJuryScores !== undefined) fileData.showJuryScores = body.showJuryScores;
      if (body.showJuradoNames !== undefined) fileData.showJuradoNames = body.showJuradoNames;
      if (body.showExternalValues !== undefined) fileData.showExternalValues = body.showExternalValues;
      if (body.teams !== undefined) fileData.teams = body.teams;
      if (body.jurados !== undefined) fileData.jurados = hashJuradoPins(body.jurados);
      if (body.provas !== undefined) fileData.provas = body.provas;
      if (body.timerStartedAt !== undefined) fileData.timerStartedAt = body.timerStartedAt;
      writeStateToFile(fileData);

      const shouldSnapshot = (
        (body.status === 'waiting' && oldData.status === 'active') ||
        (body.currentProvaId !== undefined && body.currentProvaId !== oldData.currentProvaId && oldData.currentProvaId)
      );
      if (shouldSnapshot) {
        saveSnapshot(fileData, fileData.provas || [], fileData.teams || [], fileData.scores || {});
      }

      if (await checkSupabaseAvailable()) {
        try {
          const updateFields: any = {};
          if (body.status !== undefined) updateFields.status = body.status;
          if (body.viewMode !== undefined) updateFields.view_mode = body.viewMode;
          if (body.currentProvaId !== undefined) updateFields.current_prova_id = body.currentProvaId || null;
          if (body.message !== undefined) updateFields.message = body.message;
          if (body.showJuryScores !== undefined) updateFields.show_jury_scores = body.showJuryScores;

          if (Object.keys(updateFields).length > 0) {
            const { error: cfgErr } = await supabase.from('config').update(updateFields).eq('id', 1);
            if (cfgErr) throw cfgErr;
          }

          if (body.teams !== undefined) {
            const { data: dbTeams, error: teamsErr } = await supabase.from('teams').select('id');
            if (teamsErr) throw teamsErr;
            const dbTeamIds = dbTeams?.map((t: any) => t.id) || [];
            const receivedIds = body.teams.map((t: any) => t.id);

            const toDelete = dbTeamIds.filter((id: string) => !receivedIds.includes(id));
            if (toDelete.length > 0) {
              const { error: delErr } = await supabase.from('teams').delete().in('id', toDelete);
              if (delErr) throw delErr;
            }

            for (const team of body.teams) {
              const isNew = !dbTeamIds.includes(team.id);
              const { error: upsErr } = isNew
                ? await supabase.from('teams').insert({ name: team.name, color: team.color })
                : await supabase.from('teams').upsert({ id: team.id, name: team.name, color: team.color });
              if (upsErr) throw upsErr;
            }
          }

          if (body.jurados !== undefined) {
            const { data: dbJurados, error: juradosErr } = await supabase.from('jurados').select('id');
            if (!juradosErr && dbJurados) {
              const dbJuradoIds = dbJurados.map((j: any) => j.id);
              const receivedJuradoIds = body.jurados.map((j: any) => j.id);

              const juradosToDelete = dbJuradoIds.filter((id: string) => !receivedJuradoIds.includes(id));
              if (juradosToDelete.length > 0) {
                const { error: delErr } = await supabase.from('jurados').delete().in('id', juradosToDelete);
                if (delErr) throw delErr;
              }

              for (const jurado of body.jurados) {
                const isNew = !dbJuradoIds.includes(jurado.id);
                const { error: upsErr } = isNew
                  ? await supabase.from('jurados').insert({ name: jurado.name, pin: jurado.pin || '' })
                  : await supabase.from('jurados').upsert({ id: jurado.id, name: jurado.name, pin: jurado.pin || '' });
                if (upsErr) throw upsErr;
              }
            }
          }

          if (body.provas !== undefined) {
            const { data: dbProvas, error: provasErr } = await supabase.from('provas').select('id');
            if (provasErr) throw provasErr;
            const dbProvaIds = dbProvas?.map((p: any) => p.id) || [];
            const receivedIds = body.provas.map((p: any) => p.id);

            const toDelete = dbProvaIds.filter((id: string) => !receivedIds.includes(id));
            if (toDelete.length > 0) {
              const { error: delErr } = await supabase.from('provas').delete().in('id', toDelete);
              if (delErr) throw delErr;
            }

            for (const prova of body.provas) {
              const isNew = !dbProvaIds.includes(prova.id);
              const { error: upsErr } = isNew
                ? await supabase.from('provas').insert({ name: prova.name })
                : await supabase.from('provas').upsert({ id: prova.id, name: prova.name });
              if (upsErr) throw upsErr;
            }
          }
        } catch {}
      }

      return readJsonState();
    }

    // Ação: Zerar Tudo (mantém equipes, provas e jurados cadastrados)
    if (body.action === 'reset') {
      const current = readStateFromFile();
      const provasReset = (current.provas || []).map((p: any) => ({
        ...p,
        finalized: false,
        winnerId: null,
        pointsAwarded: {},
        juryVotes: {}
      }));
      writeStateToFile({
        status: 'waiting',
        viewMode: 'prova',
        currentProvaId: '',
        message: 'Arrai-el 2026 vai começar!',
        singleVoteMode: true,
        showJuryScores: true,
        showJuradoNames: false,
        showExternalValues: false,
        timerStartedAt: null,
        teams: current.teams || [],
        provas: provasReset,
        jurados: current.jurados || [],
        scores: {}
      });
      writeFileSync(RESULTADOS_FILE, '[]');
      writeFileSync(HISTORICO_FILE, '');
      VOTED_VOTERS.clear();
      return readJsonState();
    }

    // Ação: Novo Seguimento (congela Dia 1, limpa votos, mantém resultados)
    if (body.action === 'newSegment') {
      const current = readStateFromFile();
      if (!current) return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 });

      // Backup de segurança
      try {
        writeFileSync(path.join(process.cwd(), 'backup-seguimento.json'), JSON.stringify(current, null, 2));
      } catch {}

      // Salvar snapshot de todas as provas finalizadas
      for (const prova of (current.provas || [])) {
        if (!prova.finalized && !prova.winnerId) continue;
        const pScores = current.scores?.[prova.id];
        if (!pScores) continue;
        const teamResults = (current.teams || []).map((team: any) => {
          const teamScore = pScores[team.id] || { publicVotes: 0, j1: 0, j2: 0 };
          return {
            id: team.id, name: team.name, color: team.color,
            publicVotes: teamScore.publicVotes || 0,
            publicScore: teamScore.publicVotes || 0,
            j1: teamScore.j1 || 0,
            j2: teamScore.j2 || 0,
            total: (prova.pointsAwarded?.[team.id] || 0),
            winnerPick: teamScore.j1 === 1 || teamScore.j2 === 1,
          };
        });
        const resultados = readResultadosFile();
        const idx = resultados.findIndex((r: any) => r.provaId === prova.id);
        const entry = {
          provaId: prova.id, provaName: prova.name,
          points: prova.points || 0,
          day: prova.day || 1,
          finalized: true,
          winnerId: prova.winnerId || null,
          pointsAwarded: prova.pointsAwarded || {},
          teams: teamResults,
          backupDate: new Date().toISOString()
        };
        if (idx >= 0) {
          resultados[idx] = entry;
        } else {
          resultados.push(entry);
        }
        writeResultadosFile(resultados);
      }

      writeStateToFile({
        ...current,
        status: 'waiting',
        viewMode: 'prova',
        currentProvaId: '',
        message: 'Selecione uma prova do Dia 2!',
        timerStartedAt: null,
        scores: {},
        provas: current.provas,
      });
      VOTED_VOTERS.clear();
      return readJsonState();
    }

    // Ação: Duplicar provas do Dia 1 para o Dia 2
    if (body.action === 'duplicateForDay2') {
      const current = readStateFromFile();
      if (!current) return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 });

      const day1List = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
      const nameMap: Record<string, string> = {
        p1: '1ª Apresentação Mascote do Time',
        p2: '2ª Grito de Guerra',
        p3: '3ª Rei e Rainha do Time',
        p4: '4ª Cante e Encante',
        p5: '5ª Dança Típica',
        p6: '6ª Ornamentação dos Corredores',
        p7: '7ª Barracas (Maior Arrecadação)',
        p8: '8ª Venda das Rifas',
      };

      const cloneById = (id: string) => {
        const original = (current.provas || []).find((p: any) => p.id === id);
        if (!original) return null;
        return { ...original, finalized: false, winnerId: null, pointsAwarded: {}, juryVotes: {}, day: 2 };
      };

      const day2Order = [
        { id: 'p11', name: '1ª Apresentação Mascote do Time', from: 'p1' },
        { id: 'p12', name: '2ª Grito de Guerra', from: 'p2' },
        { id: 'p13', name: '3ª Rei e Rainha do Time', from: 'p3' },
        { id: 'p14', name: '4ª Cante e Encante', from: 'p4' },
        { id: 'p15', name: '5ª Dança Típica', from: 'p5' },
        { id: 'p9',  name: '6ª Teatro', from: 'p9' },
        { id: 'p16', name: '7ª Ornamentação dos Corredores', from: 'p6' },
        { id: 'p17', name: '8ª Barracas (Maior Arrecadação)', from: 'p7' },
        { id: 'p18', name: '9ª Venda das Rifas', from: 'p8' },
        { id: 'p10', name: '10ª Instagram', from: 'p10' },
      ];

      const allProvas = [...(current.provas || [])];
      let updatedNames: Record<string, string> = {};

      for (const entry of day2Order) {
        const existingIdx = allProvas.findIndex((p: any) => p.id === entry.id);
        if (existingIdx >= 0) {
          // Atualizar nome e garantia de finalized false
          allProvas[existingIdx] = { ...allProvas[existingIdx], name: entry.name, finalized: false, day: 2 };
        } else {
          // Clonar do Dia 1
          const source = allProvas.find((p: any) => p.id === entry.from);
          if (source) {
            allProvas.push({ ...source, id: entry.id, name: entry.name, finalized: false, winnerId: null, pointsAwarded: {}, juryVotes: {}, day: 2 });
          }
        }
      }

      writeStateToFile({
        ...current,
        provas: allProvas,
      });
      return readJsonState();
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Erro interno no POST.' }, { status: 500 });
  }
}

function readJsonState() {
  const fileData = readStateFromFile();
  if (!fileData) return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 });
  const scores: any = {};
  if (fileData.scores) {
    Object.keys(fileData.scores).forEach(provaId => {
      scores[provaId] = {};
      Object.keys(fileData.scores[provaId]).forEach(teamId => {
        scores[provaId][teamId] = fileData.scores[provaId][teamId];
      });
    });
  }
  return NextResponse.json({
    status: fileData.status || 'waiting',
    viewMode: fileData.viewMode || 'prova',
    currentProvaId: fileData.currentProvaId || '',
    message: fileData.message || '',
    teams: fileData.teams || [],
    provas: fileData.provas || [],
    jurados: fileData.jurados || [],
    singleVoteMode: fileData.singleVoteMode !== undefined ? fileData.singleVoteMode : true,
    showJuryScores: fileData.showJuryScores !== undefined ? fileData.showJuryScores : true,
    showJuradoNames: fileData.showJuradoNames !== undefined ? fileData.showJuradoNames : false,
    showExternalValues: fileData.showExternalValues !== undefined ? fileData.showExternalValues : false,
    timerStartedAt: fileData.timerStartedAt || null,
    scores
  });
}
