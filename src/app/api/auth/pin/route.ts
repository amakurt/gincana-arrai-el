import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const STATE_FILE = path.join(process.cwd(), 'gincana-state.json');

const pinLimits = new Map<string, { count: number; resetAt: number }>();
function checkPinRate(ip: string): boolean {
  const now = Date.now();
  const entry = pinLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    pinLimits.set(ip, { count: 1, resetAt: now + 10000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

function readJuradosFromFile(): any[] {
  try {
    if (!existsSync(STATE_FILE)) return [];
    const raw = readFileSync(STATE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return data.jurados || [];
  } catch {
    return [];
  }
}

function verifyPin(pin: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return String(pin) === String(stored);
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(String(pin), salt, 1000, 64, 'sha512').toString('hex');
  return hash === verify;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1';
    if (!checkPinRate(ip)) {
      return NextResponse.json({ success: false, error: 'Muitas tentativas. Aguarde 10 segundos.' }, { status: 429 });
    }

    const { pin, type, name } = await request.json();

    const host = request.headers.get('host') || 'www.institutoeducacionallogos.online';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const secure = proto === 'https';
    const cookieOpts = { path: '/', sameSite: 'lax' as const, secure, httpOnly: true };

    if (type === 'admin') {
      const adminPin = process.env.ADMIN_PIN;
      if (adminPin && verifyPin(pin, adminPin)) {
        const response = NextResponse.json({ success: true, message: 'PIN Admin validado com sucesso!' });
        response.cookies.set('admin_verified', 'true', cookieOpts);
        return response;
      }
      return NextResponse.json({ success: false, error: 'PIN inválido!' }, { status: 401 });
    }

    if (type === 'jurado') {
      const allJurados = readJuradosFromFile();

      if (name) {
        const juradoMatch = allJurados.find((j: any) => j.name === name && verifyPin(pin, j.pin));
        if (juradoMatch) {
          const response = NextResponse.json({
            success: true,
            message: 'Jurado autenticado com sucesso!',
            jurado: { id: juradoMatch.id, name: juradoMatch.name }
          });
          response.cookies.set('jurado_verified', 'true', cookieOpts);
          response.cookies.set('jurado_id', juradoMatch.id, cookieOpts);
          response.cookies.set('jurado_name', encodeURIComponent(juradoMatch.name), cookieOpts);
          return response;
        }
      } else {
        const juradoMatch = allJurados.find((j: any) => verifyPin(pin, j.pin));
        if (juradoMatch) {
          const response = NextResponse.json({
            success: true,
            message: 'PIN Jurado validado com sucesso!',
            jurado: { id: juradoMatch.id, name: juradoMatch.name }
          });
          response.cookies.set('jurado_verified', 'true', cookieOpts);
          response.cookies.set('jurado_id', juradoMatch.id, cookieOpts);
          response.cookies.set('jurado_name', encodeURIComponent(juradoMatch.name), cookieOpts);
          return response;
        }
      }
    }

    return NextResponse.json({ success: false, error: 'Nome ou PIN inválido!' }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
