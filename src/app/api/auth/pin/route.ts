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

    const { pin, type } = await request.json();
    
    let adminPin = '1234';
    let juryPin = '5678';

    // Tenta Supabase primeiro
    const { data: config, error } = await supabase
      .from('config')
      .select('admin_pin, jury_pin')
      .eq('id', 1)
      .single();

    if (!error && config) {
      adminPin = config.admin_pin || adminPin;
      juryPin = config.jury_pin || juryPin;
    } else {
      // Fallback: lê do JSON file
      try {
        if (existsSync(STATE_FILE)) {
          const fileData = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
          // PINs podem estar no config ou usar defaults
        }
      } catch {}
    }

    if (type === 'admin') {
      if (pin === adminPin) {
        return NextResponse.json({ success: true, message: 'PIN Admin validado com sucesso!' });
      }
    } else if (type === 'jurado') {
      // Verifica PIN no Supabase primeiro
      const { data: dbJurados } = await supabase
        .from('jurados')
        .select('*');
      if (dbJurados) {
        const juradoMatch = dbJurados.find((j: any) => j.pin === pin);
        if (juradoMatch) {
          return NextResponse.json({
            success: true,
            message: 'PIN Jurado validado com sucesso!',
            jurado: { id: juradoMatch.id, name: juradoMatch.name, pin: juradoMatch.pin }
          });
        }
      }
      
      // Fallback para JSON file
      try {
        if (existsSync(STATE_FILE)) {
          const fileData = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
          const jurados = fileData.jurados || [];
          const juradoMatch = jurados.find((j: any) => j.pin === pin);
          if (juradoMatch) {
            return NextResponse.json({ success: true, message: 'PIN Jurado validado com sucesso!', jurado: juradoMatch });
          }
        }
      } catch {}
      
      // Fallback para PIN genérico
      if (pin === juryPin) {
        return NextResponse.json({ success: true, message: 'PIN Jurado validado com sucesso!' });
      }
    }

    return NextResponse.json({ success: false, error: 'PIN inválido!' }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
