import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'gincana-state.json');

export async function POST(request: Request) {
  try {
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
