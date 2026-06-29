import { NextResponse } from 'next/server';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

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

const clearLimits = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

export async function POST(request: Request) {
  try {
    if (!checkOrigin(request)) {
      return NextResponse.json({ error: 'Requisição rejeitada: origem inválida.' }, { status: 403 });
    }
    const body = await request.json();
    if (body.action === 'clear') {
      const ip = getClientIp(request);
      const now = Date.now();
      const entry = clearLimits.get(ip);
      if (entry && now <= entry.resetAt && entry.count >= 2) {
        return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
      }
      if (!entry || now > entry.resetAt) {
        clearLimits.set(ip, { count: 1, resetAt: now + 10000 });
      } else {
        entry.count++;
      }

      if (!request.headers.get('cookie')?.includes('admin_verified=true')) {
        return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
      }
      writeFileSync(RESULTADOS_FILE, '[]');
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
