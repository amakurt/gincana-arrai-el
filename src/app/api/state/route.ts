import { NextResponse } from 'next/server';
import { supabase, checkSupabaseAvailable } from '@/lib/supabase';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Rate limiter: in-memory sliding window
const ratelimits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 3000; // 3 second window
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
// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ratelimits) {
    if (now > v.resetAt) ratelimits.delete(k);
  }
}, 300000);

// CSRF: check Origin/Referer against allowed hosts
function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host') || 'localhost:3000';
  const allowed = [host, 'www.institutoeducacionallogos.online', 'institutoeducacionallogos.online', '137.131.160.171'];
  if (origin) return allowed.some(a => origin.includes(a));
  if (referer) return allowed.some(a => referer.includes(a));
  return false; // block requests with no origin/referer
}

const STATE_FILE = path.join(process.cwd(), 'gincana-state.json');
const RESULTADOS_FILE = path.join(process.cwd(), 'resultados.json');

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

function readJuradosFromFile(): any[] {
  const fileData = readStateFromFile();
  return fileData?.jurados || [];
}

function writeJuradosToFile(jurados: any[]) {
  const fileData = readStateFromFile() || {};
  fileData.jurados = jurados;
  writeStateToFile(fileData);
}

// Helpers para resultados (backup histórico)
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

function saveSnapshot(fileData: any, provas: any[], teams: any[], jurados: any[], scores: any) {
  const provaId = fileData.currentProvaId;
  if (!provaId || !scores[provaId]) return;

  const prova = provas.find((p: any) => p.id === provaId);
  if (!prova) return;

  const allVotes = Object.values(scores[provaId]).map((s: any) => s.publicVotes || 0);
  const maxPubVotes = Math.max(...allVotes, 0);

  const teamResults = teams.map((team: any) => {
    const teamScore = scores[provaId][team.id] || { publicVotes: 0, j1: 0, j2: 0 };
    const publicScore = maxPubVotes > 0 ? Number(((teamScore.publicVotes / maxPubVotes) * 10).toFixed(1)) : 0;
    return {
      id: team.id, name: team.name, color: team.color,
      publicVotes: teamScore.publicVotes || 0,
      publicScore,
      j1: teamScore.j1 || 0,
      j2: teamScore.j2 || 0,
      total: Number((publicScore + (teamScore.j1 || 0) + (teamScore.j2 || 0)).toFixed(1))
    };
  }).sort((a: any, b: any) => b.total - a.total);

  const resultados = readResultadosFile();
  const idx = resultados.findIndex((r: any) => r.provaId === provaId);
  const entry = {
    provaId, provaName: prova.name,
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

// Helper para calcular a pontuação de 0 a 10 baseada nos votos do público
const calcPublicScore = (votes: number, maxVotes: number) => {
  if (maxVotes === 0) return 0;
  return Number(((votes / maxVotes) * 10).toFixed(1));
};

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
    scores
  });
}

export async function GET() {
  // Lê o JSON como estado base (sempre fresco, POST escreve nele primeiro)
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
    scores: fileData.scores || {}
  } : null;

  if (!base) {
    return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 });
  }

  // Tenta enriquecer scores do Supabase (votos em tempo real via RPC)
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
    } catch {
      // fallback: mantém scores do JSON
    }
  }

  return NextResponse.json(base);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Anti-flood para mutações
    const ip = getClientIp(request);
    if ((body.action === 'vote' || body.action === 'juryVote') && !checkRateLimit(`${ip}:${body.action}`, 2)) {
      return NextResponse.json({ error: 'Muitas requisições. Aguarde alguns segundos.' }, { status: 429 });
    }
    // CSRF check for state-changing actions
    if (body.action === 'updateState' || body.action === 'reset') {
      if (!checkOrigin(request)) {
        return NextResponse.json({ error: 'Requisição rejeitada: origem inválida.' }, { status: 403 });
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

        // Tenta sincronizar com Supabase (best-effort)
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
    
    // Ação: Lançar Nota do Jurado
    if (body.action === 'juryVote') {
      if (body.teamId && body.jurado && body.score !== undefined) {
        const fileData = readStateFromFile();
        if (fileData && fileData.currentProvaId) {
          const pId = fileData.currentProvaId;
          const value = Number(body.score);
          if (!fileData.scores) fileData.scores = {};
          if (!fileData.scores[pId]) fileData.scores[pId] = {};
          if (!fileData.scores[pId][body.teamId]) fileData.scores[pId][body.teamId] = { publicVotes: 0, j1: 0, j2: 0 };
          fileData.scores[pId][body.teamId][body.jurado] = value;
          writeStateToFile(fileData);

          // Tenta sincronizar com Supabase (best-effort)
          if (await checkSupabaseAvailable()) {
            try {
              const { data: existing } = await supabase
                .from('scores')
                .select('id')
                .eq('prova_id', pId)
                .eq('team_id', body.teamId)
                .single();

              if (existing) {
                await supabase.from('scores').update({ [body.jurado]: value }).eq('id', existing.id);
              } else {
                await supabase.from('scores').insert({ prova_id: pId, team_id: body.teamId, [body.jurado]: value });
              }
            } catch {}
          }
        }
      }
      return GET();
    }
    
    // Ação: Atualizar Estado Global (Mestre de Cerimônias / Admin)
    if (body.action === 'updateState') {
      // 1. Sempre salva no JSON primeiro (armazenamento primário)
      const oldData = readStateFromFile() || {};
      const fileData = { ...oldData };
      if (body.status !== undefined) fileData.status = body.status;
      if (body.viewMode !== undefined) fileData.viewMode = body.viewMode;
      if (body.currentProvaId !== undefined) fileData.currentProvaId = body.currentProvaId || null;
      if (body.message !== undefined) fileData.message = body.message;
      if (body.singleVoteMode !== undefined) fileData.singleVoteMode = body.singleVoteMode;
      if (body.showJuryScores !== undefined) fileData.showJuryScores = body.showJuryScores;
      if (body.teams !== undefined) fileData.teams = body.teams;
      if (body.jurados !== undefined) fileData.jurados = body.jurados;
      if (body.provas !== undefined) fileData.provas = body.provas;
      writeStateToFile(fileData);

      // 2. Salvar snapshot se votação foi parada ou prova mudou
      const shouldSnapshot = (
        (body.status === 'waiting' && oldData.status === 'active') ||
        (body.currentProvaId !== undefined && body.currentProvaId !== oldData.currentProvaId && oldData.currentProvaId)
      );
      if (shouldSnapshot) {
        saveSnapshot(fileData, fileData.provas || [], fileData.teams || [], fileData.jurados || [], fileData.scores || {});
      }

      // 3. Tenta sincronizar com Supabase (best-effort, ignorando erros)
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
            const dbTeamIds = dbTeams?.map(t => t.id) || [];
            const receivedIds = body.teams.map((t: any) => t.id);

            const toDelete = dbTeamIds.filter(id => !receivedIds.includes(id));
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
            const dbProvaIds = dbProvas?.map(p => p.id) || [];
            const receivedIds = body.provas.map((p: any) => p.id);

            const toDelete = dbProvaIds.filter(id => !receivedIds.includes(id));
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
        } catch {
          // Se Supabase falhar, já salvamos no JSON — ignora o erro
        }
      }

      // 3. Retorna dados do JSON (sempre fresco)
      return readJsonState();
    }
    
    // Ação: Zerar Tudo (Reset Perigo)
    if (body.action === 'reset') {
      // 1. Limpar todas as pontuações, provas e equipes
      await supabase.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('provas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Restaurar configurações padrão
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

      // 3. Inserir equipes padrão novamente
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
