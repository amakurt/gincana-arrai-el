import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper para calcular a pontuação de 0 a 10 baseada nos votos do público
const calcPublicScore = (votes: number, maxVotes: number) => {
  if (maxVotes === 0) return 0;
  return Number(((votes / maxVotes) * 10).toFixed(1));
};

export async function GET() {
  try {
    // 1. Obter Configuração Global
    const { data: config, error: configError } = await supabase
      .from('config')
      .select('*')
      .eq('id', 1)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Erro ao obter configurações globais.' }, { status: 500 });
    }

    // 2. Obter Equipes
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: true });

    if (teamsError || !teams) {
      return NextResponse.json({ error: 'Erro ao obter equipes.' }, { status: 500 });
    }

    // 3. Obter Provas
    const { data: provas, error: provasError } = await supabase
      .from('provas')
      .select('*')
      .order('created_at', { ascending: true });

    if (provasError || !provas) {
      return NextResponse.json({ error: 'Erro ao obter provas.' }, { status: 500 });
    }

    // 4. Obter Pontuações (Scores)
    const { data: dbScores, error: scoresError } = await supabase
      .from('scores')
      .select('*');

    if (scoresError || !dbScores) {
      return NextResponse.json({ error: 'Erro ao obter pontuações.' }, { status: 500 });
    }

    // 5. Formatar pontuações para o formato retrocompatível da API:
    // { [provaId]: { [teamId]: { publicVotes, j1, j2 } } }
    const scores: any = {};
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

    // 6. Obter Jurados
    const { data: jurados, error: juradosError } = await supabase
      .from('jurados')
      .select('*')
      .order('created_at', { ascending: true });

    if (juradosError || !jurados) {
      return NextResponse.json({ error: 'Erro ao obter jurados.' }, { status: 500 });
    }

    // Retorna o estado perfeitamente compatível
    return NextResponse.json({
      status: config.status,
      viewMode: config.view_mode,
      currentProvaId: config.current_prova_id || '',
      message: config.message,
      teams: teams.map((t: any) => ({ id: t.id, name: t.name, color: t.color })),
      provas: provas.map((p: any) => ({ id: p.id, name: p.name })),
      jurados: jurados.map((j: any) => ({ id: j.id, name: j.name })),
      scores
    });
  } catch (e) {
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
        
        // Determina qual jurado atualizar
        const scoreField = body.jurado === 'j1' ? 'j1' : 'j2';
        
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
      const updateFields: any = {};
      if (body.status !== undefined) updateFields.status = body.status;
      if (body.viewMode !== undefined) updateFields.view_mode = body.viewMode;
      if (body.currentProvaId !== undefined) updateFields.current_prova_id = body.currentProvaId || null;
      if (body.message !== undefined) updateFields.message = body.message;
      
      // Atualizar configurações se houver mudanças nos campos globais
      if (Object.keys(updateFields).length > 0) {
        await supabase.from('config').update(updateFields).eq('id', 1);
      }

      // Sincronizar equipes se enviadas
      if (body.teams !== undefined) {
        const { data: dbTeams } = await supabase.from('teams').select('id');
        const dbTeamIds = dbTeams?.map(t => t.id) || [];
        const receivedTeams = body.teams || [];
        const receivedIds = receivedTeams.map((t: any) => t.id);

        // Deletar as que foram removidas no painel
        const toDelete = dbTeamIds.filter(id => !receivedIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from('teams').delete().in('id', toDelete);
        }

        // Inserir as novas ou atualizar as existentes
        for (const team of receivedTeams) {
          const isNew = team.id.startsWith('t'); // ids novos criados no admin começam com 't'
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
      }

      // Sincronizar jurados se enviados
      if (body.jurados !== undefined) {
        const { data: dbJurados } = await supabase.from('jurados').select('id');
        const dbJuradoIds = dbJurados?.map(j => j.id) || [];
        const receivedJurados = body.jurados || [];
        const receivedJuradoIds = receivedJurados.map((j: any) => j.id);

        // Deletar jurados removidos
        const juradosToDelete = dbJuradoIds.filter(id => !receivedJuradoIds.includes(id));
        if (juradosToDelete.length > 0) {
          await supabase.from('jurados').delete().in('id', juradosToDelete);
        }

        // Inserir novos ou atualizar existentes
        for (const jurado of receivedJurados) {
          const isNew = jurado.id.startsWith('j'); // ids novos criados no admin começam com 'j'
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
      }

      // Sincronizar provas se enviadas
      if (body.provas !== undefined) {
        const { data: dbProvas } = await supabase.from('provas').select('id');
        const dbProvaIds = dbProvas?.map(p => p.id) || [];
        const receivedProvas = body.provas || [];
        const receivedIds = receivedProvas.map((p: any) => p.id);

        // Deletar as removidas
        const toDelete = dbProvaIds.filter(id => !receivedIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from('provas').delete().in('id', toDelete);
        }

        // Inserir as novas ou atualizar as existentes
        for (const prova of receivedProvas) {
          const isNew = prova.id.startsWith('p'); // ids novos criados começam com 'p'
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
    return NextResponse.json({ error: 'Erro interno no POST.' }, { status: 500 });
  }
}
