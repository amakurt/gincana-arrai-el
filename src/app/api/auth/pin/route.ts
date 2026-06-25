import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'gincana-state.json');

// Rate limit for PIN brute-force
const pinLimits = new Map<string, { count: number; resetAt: number }>();
function checkPinRate(ip: string): boolean {
  const now = Date.now();
  const entry = pinLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    pinLimits.set(ip, { count: 1, resetAt: now + 10000 });
    return true;
  }
  if (entry.count >= 5) return false; // 5 attempts per 10s
  entry.count++;
  return true;
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
    const secure = proto === 'https' || host.includes('localhost') === false;
    const cookieOpts = { path: '/', sameSite: 'lax' as const, secure, httpOnly: false };

    let adminPin = '1234';
    let juryPin = '5678';

    const { data: config, error } = await supabase
      .from('config')
      .select('admin_pin, jury_pin')
      .eq('id', 1)
      .single();

    if (!error && config) {
      adminPin = config.admin_pin || adminPin;
      juryPin = config.jury_pin || juryPin;
    }

    if (type === 'admin') {
      if (pin === adminPin) {
        return NextResponse.json({ success: true, message: 'PIN Admin validado com sucesso!' });
      }
    } else if (type === 'jurado') {
      // Busca jurados do Supabase primeiro
      const { data: dbJurados } = await supabase
        .from('jurados')
        .select('*');
      const allJurados: any[] = dbJurados || [];

      // Fallback: busca do JSON file
      try {
        if (existsSync(STATE_FILE)) {
          const fileData = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
          const jsonJurados = fileData.jurados || [];
          for (const j of jsonJurados) {
            if (!allJurados.find((dj: any) => dj.id === j.id)) {
              allJurados.push(j);
            }
          }
        }
      } catch {}

      if (name) {
        // Valida nome + PIN (dupla verificação)
        const juradoMatch = allJurados.find((j: any) => j.name === name && j.pin === pin);
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
        // Fallback: só PIN (compatibilidade)
        const juradoMatch = allJurados.find((j: any) => j.pin === pin);
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

        // Fallback para PIN genérico (só sem nome)
        if (pin === juryPin) {
          const response = NextResponse.json({
            success: true,
            message: 'PIN Jurado validado com sucesso!'
          });
          response.cookies.set('jurado_verified', 'true', cookieOpts);
          return response;
        }
      }
    }

    return NextResponse.json({ success: false, error: 'Nome ou PIN inválido!' }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
