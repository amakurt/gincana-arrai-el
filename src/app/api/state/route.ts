import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const stateFile = path.join(process.cwd(), 'gincana-state.json');

const defaultState = {
  status: 'waiting', // waiting, active, finished
  viewMode: 'prova', // 'prova', 'geral'
  currentProvaId: '',
  message: 'Arrai-el 2026 vai começar!',
  teams: [
    { id: 't1', name: 'Azul', color: '#3b82f6' },
    { id: 't2', name: 'Vermelha', color: '#ef4444' }
  ],
  provas: [
    { id: 'p1', name: 'Apresentação de Dança' }
  ],
  scores: {} // { provaId: { teamId: { publicVotes: 0, j1: 0, j2: 0 } } }
};

function getState() {
  try {
    if (!fs.existsSync(stateFile)) {
      fs.writeFileSync(stateFile, JSON.stringify(defaultState));
      return defaultState;
    }
    const fileState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    
    // Se o banco for da versão antiga (sem provas), reseta para o default
    if (!fileState.provas || !fileState.teams) {
      fs.writeFileSync(stateFile, JSON.stringify(defaultState));
      return defaultState;
    }
    
    return fileState;
  } catch (e) {
    return defaultState;
  }
}

function saveState(state: any) {
  fs.writeFileSync(stateFile, JSON.stringify(state));
}

export async function GET() {
  return NextResponse.json(getState());
}

export async function POST(request: Request) {
  const body = await request.json();
  const state = getState();
  
  if (body.action === 'vote') {
    if (state.status === 'active' && state.currentProvaId) {
      const pId = state.currentProvaId;
      const tId = body.teamId;
      if (!state.scores[pId]) state.scores[pId] = {};
      if (!state.scores[pId][tId]) state.scores[pId][tId] = { publicVotes: 0, j1: 0, j2: 0 };
      
      state.scores[pId][tId].publicVotes += 1;
      saveState(state);
    }
    return NextResponse.json(state);
  }
  
  if (body.action === 'juryVote') {
    if (state.currentProvaId) {
      const pId = state.currentProvaId;
      const tId = body.teamId;
      if (!state.scores[pId]) state.scores[pId] = {};
      if (!state.scores[pId][tId]) state.scores[pId][tId] = { publicVotes: 0, j1: 0, j2: 0 };
      
      if (body.jurado === 'j1') state.scores[pId][tId].j1 = Number(body.score);
      if (body.jurado === 'j2') state.scores[pId][tId].j2 = Number(body.score);
      saveState(state);
    }
    return NextResponse.json(state);
  }

  if (body.action === 'updateState') {
    // Merge provided fields
    if (body.status !== undefined) state.status = body.status;
    if (body.viewMode !== undefined) state.viewMode = body.viewMode;
    if (body.currentProvaId !== undefined) state.currentProvaId = body.currentProvaId;
    if (body.message !== undefined) state.message = body.message;
    if (body.teams !== undefined) state.teams = body.teams;
    if (body.provas !== undefined) state.provas = body.provas;
    
    saveState(state);
    return NextResponse.json(state);
  }

  if (body.action === 'reset') {
    saveState(defaultState);
    return NextResponse.json(defaultState);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
