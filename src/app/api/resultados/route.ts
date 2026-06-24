import { NextResponse } from 'next/server';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

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
