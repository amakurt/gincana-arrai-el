import { NextResponse } from 'next/server';

const loginLimits = new Map<string, { count: number; resetAt: number }>();

function checkLoginRate(ip: string): boolean {
  const now = Date.now();
  const entry = loginLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    loginLimits.set(ip, { count: 1, resetAt: now + 10000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

const REDIRECT_BASE = 'https://www.institutoeducacionallogos.online';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkLoginRate(ip)) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns segundos.' }, { status: 429 });
    }

    const contentType = request.headers.get('content-type') || '';
    let username: string, password: string;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      username = body.username;
      password = body.password;
    } else {
      const formData = await request.formData();
      username = formData.get('username') as string;
      password = formData.get('password') as string;
    }

    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedUser || !expectedPassword) {
      return NextResponse.json({ error: 'Credenciais não configuradas no servidor.' }, { status: 500 });
    }

    if (username === expectedUser && password === expectedPassword) {
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const secure = proto === 'https';
      const response = NextResponse.redirect(`${REDIRECT_BASE}/admin`);
      const cookieOpts = { path: '/', sameSite: 'lax' as const, secure, httpOnly: true };
      response.cookies.set('admin_verified', 'true', cookieOpts);
      response.cookies.set('jurado_verified', 'true', cookieOpts);
      return response;
    }

    if (contentType.includes('application/json')) {
      return NextResponse.json({ success: false, error: 'Usuário ou senha incorretos!' }, { status: 401 });
    }

    return NextResponse.redirect(`${REDIRECT_BASE}/login?error=1`);
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
