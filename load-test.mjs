// Load test — simula N usuários simultâneos acessando o sistema
// Uso: node load-test.mjs <url_base> [concorrencia] [duracao_segundos]
// Exemplo: node load-test.mjs https://www.institutoeducacionallogos.online 50 30

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const CONCURRENCY = parseInt(process.argv[3]) || 20;
const DURATION_SEC = parseInt(process.argv[4]) || 15;
const POLL_INTERVAL_MS = 3000;

const endpoints = {
  home:       { url: '/',                         method: 'GET'  },
  telao:      { url: '/screen',                   method: 'GET'  },
  estado:     { url: '/api/state',                method: 'GET'  },
  vote:       { url: '/api/state',                method: 'POST', body: { action: 'vote', teamId: 't1', voterId: () => `loadtest_${Date.now()}_${Math.random().toString(36).slice(2,9)}` } },
};

let completed = 0;
let errors = 0;
const latencies = [];
let running = true;

async function request(name, cfg) {
  const start = performance.now();
  try {
    const opts = { method: cfg.method };
    if (cfg.body) {
      opts.headers = { 'Content-Type': 'application/json' };
      const body = typeof cfg.body === 'function' ? cfg.body() : { ...cfg.body };
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${BASE_URL}${cfg.url}`, opts);
    const elapsed = performance.now() - start;
    latencies.push(elapsed);
    completed++;
    if (!res.ok) errors++;
    return elapsed;
  } catch {
    errors++;
    completed++;
    return -1;
  }
}

async function userSession(userId) {
  // Cada usuário simulado: carrega página, da refresh, vota
  while (running) {
    // Comportamento realista: maioria só consulta
    const rand = Math.random();
    if (rand < 0.3) {
      await request('home', endpoints.home);
    } else if (rand < 0.5) {
      await request('telao', endpoints.telao);
    } else if (rand < 0.85) {
      await request('estado', endpoints.estado);
    } else {
      await request('vote', endpoints.vote);
    }
    // Pequena variação no intervalo pra não sincronizar
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS * (0.5 + Math.random())));
  }
}

async function main() {
  console.log(`\n🚀 Load Test — ${BASE_URL}`);
  console.log(`   Concorrência: ${CONCURRENCY} usuários simultâneos`);
  console.log(`   Duração: ${DURATION_SEC}s\n`);
  console.log('   Aguardando resultados...\n');

  setTimeout(() => { running = false; }, DURATION_SEC * 1000);

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => userSession(i));
  await Promise.all(workers);

  const total = completed;
  const avgLatency = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const p99 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0;
  const success = total - errors;
  const rps = total / DURATION_SEC;

  console.log('═'.repeat(50));
  console.log('📊  RESULTADOS');
  console.log('═'.repeat(50));
  console.log(`   Requisições:        ${total}`);
  console.log(`   ✅ Sucesso:         ${success} (${(success/total*100).toFixed(1)}%)`);
  console.log(`   ❌ Erros:           ${errors} (${(errors/total*100).toFixed(1)}%)`);
  console.log(`   ⚡ Requisições/seg: ${rps.toFixed(1)}`);
  console.log(`   📈 Latência média:  ${avgLatency.toFixed(0)}ms`);
  console.log(`   📈 P95:             ${p95.toFixed(0)}ms`);
  console.log(`   📈 P99:             ${p99.toFixed(0)}ms`);
  console.log('═'.repeat(50));
  console.log('');

  // Interpretação básica
  if (errors / total > 0.1) {
    console.log('⚠️  Mais de 10% de erros — servidor pode estar sobrecarregado.');
  } else if (p95 > 3000) {
    console.log('⚠️  P95 acima de 3s — latência alta, considerar otimizações.');
  } else if (p95 < 500) {
    console.log('✅  P95 abaixo de 500ms — sistema responsivo.');
  }

  if (total / DURATION_SEC > 50) {
    console.log(`✅  Suporta ${rps.toFixed(0)} req/s (${(rps * 60).toFixed(0)} req/min) sem degradação.\n`);
  }
}

main().catch(console.error);
