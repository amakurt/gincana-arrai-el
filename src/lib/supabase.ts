function noopRes() {
  return Promise.resolve({ data: null, error: new Error('Supabase não disponível') });
}

function chainable() {
  return new Proxy(() => {}, {
    get: () => chainable(),
    apply: () => noopRes()
  }) as any;
}

const supabase = new Proxy({} as Record<string, any>, {
  get: () => chainable
});

async function checkSupabaseAvailable(): Promise<boolean> {
  return false;
}

export { supabase, checkSupabaseAvailable };
