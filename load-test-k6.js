// k6 load test — simula usuários reais no sistema da gincana
// Uso: k6 run --vus 50 --duration 30s load-test-k6.js
// Opções:
//   --vus N        número de usuários simultâneos (padrão: 20)
//   --duration Ns  duração em segundos (padrão: 30s)
//   -e BASE_URL=url  alvo do teste (padrão: http://localhost:3000)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const erroRate = new Rate('erros');
const latencyHome = new Trend('latency_home');
const latencyEstado = new Trend('latency_estado');
const latencyVoto = new Trend('latency_voto');
const latencyTelao = new Trend('latency_telao');

export const options = {
  stages: [
    { duration: '10s', target: 20 },   // sobe para 20 usuários
    { duration: '20s', target: 50 },   // sobe para 50
    { duration: '10s', target: 100 },  // sobe para 100
    { duration: '10s', target: 0 },    // desce
  ],
  thresholds: {
    erros: ['rate<0.1'],               // menos de 10% de erros
    latency_estado: ['p(95)<3000'],    // 95% das consultas < 3s
  },
};

const TEAMS = ['t1', 't2', 't3', 't4'];
const teamId = () => TEAMS[Math.floor(Math.random() * TEAMS.length)];
const voterId = () => `k6_${__VU}_${Date.now()}`;

export default function () {
  const rand = Math.random();

  // 35% das requisições: consultar estado (polling)
  if (rand < 0.35) {
    const r = http.get(`${BASE_URL}/api/state`);
    latencyEstado.add(r.timings.duration);
    check(r, { 'state OK': r => r.status === 200 });
    erroRate.add(r.status !== 200);
    sleep(2.5 + Math.random());

  // 20% das requisições: carregar home page
  } else if (rand < 0.55) {
    const r = http.get(BASE_URL);
    latencyHome.add(r.timings.duration);
    check(r, { 'home OK': r => r.status === 200 });
    erroRate.add(r.status !== 200);
    sleep(2 + Math.random());

  // 20% das requisições: carregar telão
  } else if (rand < 0.75) {
    const r = http.get(`${BASE_URL}/screen`);
    latencyTelao.add(r.timings.duration);
    check(r, { 'telao OK': r => r.status === 200 });
    erroRate.add(r.status !== 200);
    sleep(3 + Math.random());

  // 15% das requisições: votar
  } else if (rand < 0.9) {
    const r = http.post(`${BASE_URL}/api/state`, JSON.stringify({
      action: 'vote', teamId: teamId(), voterId: voterId(),
    }), { headers: { 'Content-Type': 'application/json' } });
    latencyVoto.add(r.timings.duration);
    check(r, { 'voto OK': r => r.status === 200 });
    erroRate.add(r.status !== 200);
    sleep(1 + Math.random() * 2);

  // 10% das requisições: notas do júri
  } else {
    const r = http.post(`${BASE_URL}/api/state`, JSON.stringify({
      action: 'juryVote', teamId: teamId(), jurado: 'j1', score: Math.floor(Math.random() * 10),
    }), { headers: { 'Content-Type': 'application/json' } });
    latencyVoto.add(r.timings.duration);
    check(r, { 'jury OK': r => r.status === 200 });
    erroRate.add(r.status !== 200);
    sleep(1 + Math.random() * 2);
  }
}
