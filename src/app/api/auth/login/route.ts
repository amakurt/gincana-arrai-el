import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'arraiel2026';

    if (username === expectedUser && password === expectedPassword) {
      return NextResponse.json({ success: true, message: 'Autenticação bem-sucedida!' });
    }

    return NextResponse.json({ success: false, error: 'Usuário ou senha incorretos!' }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
