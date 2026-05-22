import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'gincana-state.json');

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

// Helper para calcular a pontuação de 0 a 10 baseada nos votos do público
const calcPublicScore = (votes: number, maxVotes: number) => {
  if (maxVotes === 0) return 0;
  return Number(((votes / maxVotes) * 10).toFixed(1));
};

export async function GET() {
  try {
    const fileDataFallback = readStateFromFile();
    // 1. Obter Configuração Global
    const { data: config, error: configError } = await supabase
      .from('config')
      .select('*')
      .eq('id', 1)
      .single();

    // Se Supabase falhar, usa JSON file como fallback completo
    if (configError || !config) {
      const fileData = readStateFromFile();
      if (fileData) {
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
      return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 500 });
    }

    // 2. Obter Equipes
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: true });

    if (teamsError || !teams) {
      const fileData = readStateFromFile();
      return NextResponse.json({
        status: config.status,
        viewMode: config.view_mode,
        currentProvaId: config.current_prova_id || '',
        message: config.message,
        teams: fileData?.teams || [],
        provas: [],
        jurados: [],
        singleVoteMode: config.single_vote_mode !== undefined ? config.single_vote_mode : (fileData?.singleVoteMode !== undefined ? fileData.singleVoteMode : true),
        showJuryScores: config.show_jury_scores !== undefined ? config.show_jury_scores : (fileData?.showJuryScores !== undefined ? fileData.showJuryScores : true),
        scores: {}
      });
    }

    // 3. Obter Provas
    const { data: provas, error: provasError } = await supabase
      .from('provas')
      .select('*')
      .order('created_at', { ascending: true });

    if (provasError || !provas) {
      const fileData = readStateFromFile();
      return NextResponse.json({
        status: config.status,
        viewMode: config.view_mode,
        currentProvaId: config.current_prova_id || '',
        message: config.message,
        teams: teams.map((t: any) => ({ id: t.id, name: t.name, color: t.color })),
        provas: fileData?.provas || [],
        jurados: [],
        singleVoteMode: config.single_vote_mode !== undefined ? config.single_vote_mode : (fileData?.singleVoteMode !== undefined ? fileData.singleVoteMode : true),
        showJuryScores: config.show_jury_scores !== undefined ? config.show_jury_scores : (fileData?.showJuryScores !== undefined ? fileData.showJuryScores : true),
        scores: {}
      });
    }

    // 4. Obter Pontuações (Scores)
    const { data: dbScores, error: scoresError } = await supabase
      .from('scores')
      .select('*');

    const scores: any = {};
    if (!scoresError && dbScores) {
      dbScores.forEach((row: any) => {
        if (!scores[row.prova_id]) {
          scores[row.prova_id] = {};
        }
        scores[row.prova_id][row.team_id] = {
          publicVotes: row.public_votes || 0,
          j1: Number(row.j1) || 0,
          j2: Number(row.j2) || 0
        };
      });
    }

    // 5. Obter Jurados (tabela pode não existir — usa JSON file como fallback)
    let juradosList: any[] = [];
    const { data: jurados, error: juradosError } = await supabase
      .from('jurados')
      .select('*')
      .order('created_at', { ascending: true });

    if (!juradosError && jurados) {
      juradosList = jurados.map((j: any) => ({ id: j.id, name: j.name }));
    } else {
      juradosList = readJuradosFromFile();
    }

    return NextResponse.json({
      status: config.status,
      viewMode: config.view_mode,
      currentProvaId: config.current_prova_id || '',
      message: config.message,
      teams: teams.map((t: any) => ({ id: t.id, name: t.name, color: t.color })),
      provas: provas.map((p: any) => ({ id: p.id, name: p.name })),
      jurados: juradosList,
      singleVoteMode: config.single_vote_mode !== undefined && config.single_vote_mode !== null ? config.single_vote_mode : (fileDataFallback?.singleVoteMode !== undefined ? fileDataFallback.singleVoteMode : true),
      showJuryScores: config.show_jury_scores !== undefined && config.show_jury_scores !== null ? config.show_jury_scores : (fileDataFallback?.showJuryScores !== undefined ? fileDataFallback.showJuryScores : true),
      scores
    });
  } catch (e) {
    // Fallback final: lê tudo do JSON
    const fileData = readStateFromFile();
    if (fileData) {
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
        scores: fileData.scores || {}
      });
    }
    return NextResponse.json({ error: 'Erro interno ao processar estado.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Ação: Registrar Voto do Público (Votação Concorrente-safe)
    if (body.action === 'vote') {
      const { data: config } = await supabase.from('config').select('status, current_prova_id').eq('id', 1).single();
      
      if (config && config.status === 'active' && config.current_prova_id && body.teamId) {
        // Chama a RPC atômica que criamos no Postgres do Supabase
        const { error } = await supabase.rpc('increment_public_vote', {
          p_prova_id: config.current_prova_id,
          p_team_id: body.teamId
        });

        if (error) {
          return NextResponse.json({ error: 'Erro ao computar voto no banco.' }, { status: 500 });
        }
      }
      
      // Retorna o novo estado atualizado
      return GET();
    }
    
    // Ação: Lançar Nota do Jurado
    if (body.action === 'juryVote') {
      const { data: config } = await supabase.from('config').select('current_prova_id').eq('id', 1).single();
      
      if (config && config.current_prova_id && body.teamId && body.jurado) {
        const pId = config.current_prova_id;
        const tId = body.teamId;
        const value = Number(body.score);
        
        // Mapeia o ID do jurado para a coluna j1/j2 baseado na posição na lista ordenada
        let juradoIndex = -1;
        const { data: dbJurados } = await supabase
          .from('jurados')
          .select('id')
          .order('created_at', { ascending: true });
        if (dbJurados) {
          juradoIndex = dbJurados.findIndex((j: any) => j.id === body.jurado);
        }
        if (juradoIndex === -1) {
          // Fallback: busca no JSON file
          const fileJurados = readJuradosFromFile();
          juradoIndex = fileJurados.findIndex((j: any) => j.id === body.jurado);
        }
        const scoreField = juradoIndex === 0 ? 'j1' : 'j2';
        
        // Verifica se a pontuação já existe para criar ou atualizar
        const { data: existing } = await supabase
          .from('scores')
          .select('id')
          .eq('prova_id', pId)
          .eq('team_id', tId)
          .single();

        if (existing) {
          await supabase
            .from('scores')
            .update({ [scoreField]: value })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('scores')
            .insert({
              prova_id: pId,
              team_id: tId,
              [scoreField]: value
            });
        }
      }
      
      return GET();
    }
    
    // Ação: Atualizar Estado Global (Mestre de Cerimônias / Admin)
    if (body.action === 'updateState') {
      // Salva singleVoteMode e showJuryScores sempre no JSON file (garante persistência)
      if (body.singleVoteMode !== undefined) {
        const fileData = readStateFromFile() || {};
        fileData.singleVoteMode = body.singleVoteMode;
        writeStateToFile(fileData);
      }
      if (body.showJuryScores !== undefined) {
        const fileData = readStateFromFile() || {};
        fileData.showJuryScores = body.showJuryScores;
        writeStateToFile(fileData);
      }

      // Tenta Supabase primeiro, com fallback para JSON
      try {
        const updateFields: any = {};
        if (body.status !== undefined) updateFields.status = body.status;
        if (body.viewMode !== undefined) updateFields.view_mode = body.viewMode;
        if (body.currentProvaId !== undefined) updateFields.current_prova_id = body.currentProvaId || null;
        if (body.message !== undefined) updateFields.message = body.message;
        if (body.showJuryScores !== undefined) updateFields.show_jury_scores = body.showJuryScores;
        
        if (Object.keys(updateFields).length > 0) {
          await supabase.from('config').update(updateFields).eq('id', 1);
        }
      } catch {
        // Supabase falhou - atualiza JSON file diretamente
        const fileData = readStateFromFile() || {};
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
        return GET();
      }

      // Sincronizar equipes se enviadas
      if (body.teams !== undefined) {
        try {
          const { data: dbTeams } = await supabase.from('teams').select('id');
          const dbTeamIds = dbTeams?.map(t => t.id) || [];
          const receivedTeams = body.teams || [];
          const receivedIds = receivedTeams.map((t: any) => t.id);

          const toDelete = dbTeamIds.filter(id => !receivedIds.includes(id));
          if (toDelete.length > 0) {
            await supabase.from('teams').delete().in('id', toDelete);
          }

          for (const team of receivedTeams) {
            const isNew = !dbTeamIds.includes(team.id);
            if (isNew) {
              await supabase.from('teams').insert({
                name: team.name,
                color: team.color
              });
            } else {
              await supabase.from('teams').upsert({
                id: team.id,
                name: team.name,
                color: team.color
              });
            }
          }
        } catch {
          // Supabase falhou - atualiza JSON
          const fileData = readStateFromFile() || {};
          fileData.teams = body.teams;
          writeStateToFile(fileData);
        }
      }

      // Sincronizar jurados se enviados
      if (body.jurados !== undefined) {
        try {
          const { data: dbJurados, error: juradosTableError } = await supabase.from('jurados').select('id');

          if (!juradosTableError && dbJurados) {
            const dbJuradoIds = dbJurados.map((j: any) => j.id);
            const receivedJuradoIds = body.jurados.map((j: any) => j.id);

            const juradosToDelete = dbJuradoIds.filter((id: string) => !receivedJuradoIds.includes(id));
            if (juradosToDelete.length > 0) {
              await supabase.from('jurados').delete().in('id', juradosToDelete);
            }

            for (const jurado of body.jurados) {
              const isNew = !dbJuradoIds.includes(jurado.id);
              if (isNew) {
                await supabase.from('jurados').insert({
                  name: jurado.name,
                  pin: jurado.pin || ''
                });
              } else {
                await supabase.from('jurados').upsert({
                  id: jurado.id,
                  name: jurado.name,
                  pin: jurado.pin || ''
                });
              }
            }
          } else {
            writeJuradosToFile(body.jurados);
          }
        } catch {
          writeJuradosToFile(body.jurados);
        }
      }

      // Sincronizar provas se enviadas
      if (body.provas !== undefined) {
        try {
          const { data: dbProvas } = await supabase.from('provas').select('id');
          const dbProvaIds = dbProvas?.map(p => p.id) || [];
          const receivedProvas = body.provas || [];
          const receivedIds = receivedProvas.map((p: any) => p.id);

          const toDelete = dbProvaIds.filter(id => !receivedIds.includes(id));
          if (toDelete.length > 0) {
            await supabase.from('provas').delete().in('id', toDelete);
          }

          for (const prova of receivedProvas) {
            const isNew = !dbProvaIds.includes(prova.id);
            if (isNew) {
              await supabase.from('provas').insert({
                name: prova.name
              });
            } else {
              await supabase.from('provas').upsert({
                id: prova.id,
                name: prova.name
              });
            }
          }
        } catch {
          const fileData = readStateFromFile() || {};
          fileData.provas = body.provas;
          writeStateToFile(fileData);
        }
      }

      return GET();
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
  } catch (e) {
    // Fallback: tenta salvar no JSON
    const body = await request.json().catch(() => null);
    if (body?.action === 'updateState') {
      const fileData = readStateFromFile() || {};
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
      return GET();
    }
    return NextResponse.json({ error: 'Erro interno no POST.' }, { status: 500 });
  }
}
