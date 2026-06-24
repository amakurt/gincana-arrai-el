import { NextResponse } from 'next/server';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host') || 'localhost:3000';
  const allowed = [host, 'www.institutoeducacionallogos.online', 'institutoeducacionallogos.online', '137.131.160.171'];
  if (origin) return allowed.some(a => origin.includes(a));
  if (referer) return allowed.some(a => referer.includes(a));
  return false;
}

const RESULTADOS_FILE = path.join(process.cwd(), 'resultados.json');

function readResultados(): any[] {
  try {
    if (!existsSync(RESULTADOS_FILE)) return [];
    return JSON.parse(readFileSync(RESULTADOS_FILE, 'utf-8'));
  } catch { return []; }
}

export async function GET() {
  const resultados = readResultados();
  return NextResponse.json(resultados);
}

export async function POST(request: Request) {
  try {
    if (!checkOrigin(request)) {
      return NextResponse.json({ error: 'Requisição rejeitada: origem inválida.' }, { status: 403 });
    }
    const body = await request.json();
    if (body.action === 'clear') {
      writeFileSync(RESULTADOS_FILE, '[]');
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
