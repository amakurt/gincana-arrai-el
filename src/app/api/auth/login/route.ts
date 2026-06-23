import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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

    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'arraiel2026';

    if (username === expectedUser && password === expectedPassword) {
      const host = request.headers.get('host') || 'www.institutoeducacionallogos.online';
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const response = NextResponse.redirect(`${proto}://${host}/admin`);
      response.cookies.set('admin_verified', 'true', { path: '/', sameSite: 'lax' });
      response.cookies.set('jurado_verified', 'true', { path: '/', sameSite: 'lax' });
      return response;
    }

    if (contentType.includes('application/json')) {
      return NextResponse.json({ success: false, error: 'Usuário ou senha incorretos!' }, { status: 401 });
    }

    const host = request.headers.get('host') || 'www.institutoeducacionallogos.online';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    return NextResponse.redirect(`${proto}://${host}/login?error=1`);
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
