import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const HISTORICO_FILE = path.join(process.cwd(), 'votacoes-historico.jsonl');

function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host') || 'localhost:3000';
  const allowed = [host, 'www.institutoeducacionallogos.online', 'institutoeducacionallogos.online', '137.131.160.171'];
  if (origin) return allowed.some(a => origin.includes(a));
  if (referer) return allowed.some(a => referer.includes(a));
  return false;
}

export async function GET() {
  try {
    if (!existsSync(HISTORICO_FILE)) {
      return NextResponse.json([]);
    }
    const raw = readFileSync(HISTORICO_FILE, 'utf-8');
    const linhas = raw.trim().split('\n').filter(Boolean);
    let entries = linhas.map((linha: string) => {
      try { return JSON.parse(linha); } catch { return null; }
    }).filter(Boolean);

    // Filtrar apenas provas do Dia 2
    const STATE_FILE = path.join(process.cwd(), 'gincana-state.json');
    if (existsSync(STATE_FILE)) {
      const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
      const day2Ids = new Set((state.provas || []).filter((p: any) => p.day === 2).map((p: any) => p.id));
      if (day2Ids.size > 0) {
        entries = entries.filter((e: any) => day2Ids.has(e.provaId));
      }
    }

    // Retorna do mais recente para o mais antigo
    entries.reverse();
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: 'Erro ao ler histórico.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Requisição rejeitada.' }, { status: 403 });
  }
  try {
    const body = await request.json();
    if (body.action === 'clear') {
      writeFileSync(HISTORICO_FILE, '');
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
