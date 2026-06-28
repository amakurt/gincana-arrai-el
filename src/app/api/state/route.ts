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

function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host') || 'localhost:3000';
  const allowed = [host, 'www.institutoeducacionallogos.online', 'institutoeducacionallogos.online', '137.131.160.171'];
  if (origin) return allowed.some(a => origin.includes(a));
  if (referer) return allowed.some(a => referer.includes(a));
  return false;
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
      j1: teamScore.j1 || 0,
      j2: teamScore.j2 || 0,
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

function getAudienceWinner(provaId: string, scores: any, teams: any[]) {
  const pScores = scores[provaId];
  if (!pScores) return null;
  const pubVotes = teams.map((t: any) => ({ id: t.id, votes: pScores[t.id]?.publicVotes || 0 }));
  if (pubVotes.length !== 2) return null;
  if (pubVotes[0].votes > pubVotes[1].votes) return pubVotes[0].id;
  if (pubVotes[1].votes > pubVotes[0].votes) return pubVotes[1].id;
  return null;
}

function calculateProvaPoints(prova: any, j1Pick: string | null, j2Pick: string | null, audienceWinner: string | null, teams: any[]) {
  const provaPoints = prova.points || 0;
  const pointsAwarded: Record<string, number> = {};
  for (const team of teams) {
    pointsAwarded[team.id] = 0;
  }

  let winnerId: string | null = null;

  if (j1Pick && j2Pick && j1Pick === j2Pick) {
    winnerId = j1Pick;
  } else if (j1Pick && j2Pick && j1Pick !== j2Pick) {
    winnerId = audienceWinner;
  } else if (j1Pick) {
    winnerId = j1Pick;
  } else if (j2Pick) {
    winnerId = j2Pick;
  }

  if (winnerId) {
    pointsAwarded[winnerId] = provaPoints;
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
    scores: fileData.scores || {},
    timerStartedAt: fileData.timerStartedAt || null
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
    if (body.action === 'updateState' || body.action === 'finalizeProva') {
      if (!checkOrigin(request)) {
        return NextResponse.json({ error: 'Requisição rejeitada: origem inválida.' }, { status: 403 });
      }
    }

    if (body.action === 'vote' || body.action === 'juryVote') {
      const secret = process.env.TURNSTILE_SECRET_KEY;
      if (secret && secret.length > 0) {
        const cfToken = body.cfToken || '';
        if (!cfToken) {
          return NextResponse.json({ error: 'Aguardando verificação de segurança...' }, { status: 403 });
        }
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
          voterId: body.voterId || 'anon'
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

      if (j1Pick && j2Pick && j1Pick !== j2Pick && !audienceWinner) {
        return NextResponse.json({
          error: 'Jurados discordaram e público empatou.',
          details: 'Definir vencedor manualmente no painel.'
        }, { status: 400 });
      }

      const { pointsAwarded, winnerId } = calculateProvaPoints(prova, j1Pick, j2Pick, audienceWinner, teams);

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
      let winnerId: string | null = null;
      let maxVal = -1;

      for (const team of teams) {
        const v = vals[team.id];
        if (v !== undefined && v > maxVal) {
          maxVal = v;
          winnerId = team.id;
        }
      }

      if (winnerId) {
        pointsAwarded[winnerId] = points;
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
      if (body.teams !== undefined) fileData.teams = body.teams;
      if (body.jurados !== undefined) fileData.jurados = body.jurados;
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

    // Ação: Zerar Tudo
    if (body.action === 'reset') {
      await supabase.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('provas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      await supabase.from('config').upsert({
        id: 1,
        status: 'waiting',
        view_mode: 'prova',
        current_prova_id: null,
        message: 'Arrai-el 2026 vai começar!',
        show_jury_scores: true,
        admin_pin: '1234',
        jury_pin: '5678'
      });

      await supabase.from('teams').insert([
        { name: 'Azul', color: '#3b82f6' },
        { name: 'Vermelha', color: '#ef4444' },
        { name: 'Verde', color: '#10b981' },
        { name: 'Amarela', color: '#f59e0b' }
      ]);

      return GET();
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
    timerStartedAt: fileData.timerStartedAt || null,
    scores
  });
}
