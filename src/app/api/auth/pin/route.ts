import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { pin, type } = await request.json(); // type: 'admin' | 'jurado'
    
    // Buscar os pins configurados no Supabase
    const { data: config, error } = await supabase
      .from('config')
      .select('admin_pin, jury_pin')
      .eq('id', 1)
      .single();

    if (error || !config) {
      return NextResponse.json({ error: 'Erro ao buscar configurações no banco.' }, { status: 500 });
    }

    if (type === 'admin') {
      if (pin === config.admin_pin) {
        return NextResponse.json({ success: true, message: 'PIN Admin validado com sucesso!' });
      }
    } else if (type === 'jurado') {
      if (pin === config.jury_pin) {
        return NextResponse.json({ success: true, message: 'PIN Jurado validado com sucesso!' });
      }
    }

    return NextResponse.json({ success: false, error: 'PIN inválido!' }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
