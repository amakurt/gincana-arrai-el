import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Check your .env.local file.');
}

let supabaseAvailable: boolean | null = null;

async function checkSupabaseAvailable(): Promise<boolean> {
  if (supabaseAvailable !== null) return supabaseAvailable;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: supabaseAnonKey },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    supabaseAvailable = res.ok;
    return supabaseAvailable;
  } catch {
    supabaseAvailable = false;
    return false;
  }
}

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export { supabaseClient, checkSupabaseAvailable };
export const supabase = supabaseClient;
