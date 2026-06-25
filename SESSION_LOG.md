# Session Log

## 2026-05-20

- Implemented password visibility toggle on login page (`src/app/login/page.tsx`).
- Fixed missing UI component imports on admin jurados page by replacing with native HTML elements (`src/app/admin/jurados/page.tsx`).
- Added `next.config.js` with `allowedDevOrigins` to allow network access (`192.168.20.76`).
- Verified that the login page works locally on `http://localhost:3000/login` and that the eye icon now toggles password visibility.
- Prepared repository for push to GitHub.

## 2026-06-18

### Otimizações de Performance — VPS Oracle

- **Swap file**: Adicionado 1GB swap (`/swapfile`, persistente em `/etc/fstab`) para evitar OOM.
- **PM2**: Migrado de fork para **2 instâncias fork** em portas separadas (3000 e 3001) com `ecosystem.config.js`. Cluster mode não funciona com Next.js (conflito de porta).
- **Node.js memory limit**: `NODE_OPTIONS='--max-old-space-size=400'` via env no ecosystem.config.js.
- **Nginx**: Adicionado `upstream gincana_backend` com `least_conn` para balanceamento entre as 2 instâncias + `proxy_cache_path` para cache de assets estáticos e página inicial.
- **Cache**: `/_next/static/` e assets (`.ico,.svg,.png,.woff2` etc) com `max-age=31536000` (immutable). Home page (`/`) cacheada por 60min com `proxy_cache`. API routes sem cache.
- **Análise de capacidade**: ~200–400 usuários simultâneos em páginas SSR, ~100–200 em votação/API. Gargalo principal é Supabase free tier (100 conexões).

### Estado Atual do Servidor
- Nginx: active, 2 worker processes
- PM2: 2 instâncias (`gincana-1`:3000, `gincana-2`:3001), cada uma ~137MB, 0 restarts
- RAM: 954MB total, ~407MB available, swap 0 uso efetivo
- Home page: HTTP 200 em ~1.5ms (cached via Nginx)

## 2026-06-18 (Parte 2)

### Problema de Acesso via HTTP no Chrome
- Página `/admin` retorna conteúdo mas Chrome em incognito exibe "This page couldn't load" após login
- Causa: navegador faz upgrade automático HTTP→HTTPS, e não há certificado
- Login API (`/api/auth/login`) funciona corretamente (testado via curl)
- Nginx simplificado temporariamente (removido upstream, direto pra porta 3000)

### Domínio
- Usuário tentou registrar `institutoeducacionallogos.com.br` no Registro.br
- Cancelado por não confirmar cadastro no email de validação
- Antigo domínio venceu na HostGator e entrou em processo de liberação (10/06 a 17/06)
- **Pendente**: Tentar registrar de novo validando o email, ou usar Cloudflare Tunnel como fallback

### Nginx Atual
- Configuração simplificada: proxy direto pra `127.0.0.1:3000`, cache de assets e home page
- Load balancing removido temporariamente para debug

## 2026-06-23

### Mudanças

- **HTTPS via Cloudflare Tunnel**: Configurado e rodando. Domínio `www.institutoeducacionallogos.online` com SSL. O tunnel roteia direto pra `localhost:3000`, bypassando Nginx.
- **Login redirect fix** (`src/app/api/auth/login/route.ts`, `src/app/login/page.tsx`, `src/app/admin/page.tsx`):
  - Login mudado de `fetch` + `window.location.href` para **form POST tradicional** com redirect server-side (307).
  - API route agora aceita `application/x-www-form-urlencoded` (form) e `application/json`.
  - Em vez de `sessionStorage`, usa **cookies** (`admin_verified`, `jurado_verified`) setados via `response.cookies.set()`.
  - Admin page lê cookies (`getCookie()`) em vez de `sessionStorage`.
  - Resolve o erro "This page couldn't load" no Chrome após login.
- **Home page sem Telão** (`src/app/page.tsx`): Removido link para `/screen` da página inicial. Acesso ao telão só pelo painel admin.
- **Botão "VER PLACAR COMPLETO"** (`src/app/vote/page.tsx`): Após votar, mostra botão que abre o telão (`/screen`) em nova aba.

### Pendente
- **Admin/jurados page** (`src/app/admin/jurados/page.tsx`): Sem verificação de `admin_verified` — qualquer um pode acessar.
- **Domínio raiz** (`institutoeducacionallogos.online` sem `www`): Aponta pro IP errado (`162.240.81.81`), não pro VPS.

## 2026-06-24

### Mudanças

- **SESSION_LOG.md**: Adicionada sessão de 23/06/2026 (completa).
- **Admin/jurados auth** (`src/app/admin/jurados/page.tsx`): Adicionada verificação `admin_verified` via cookie com redirect para `/login` — mesma lógica do admin page.
- **Domínio raiz**: Verificado — DNS já está corrigido, ambos `institutoeducacionallogos.online` e `www.*` apontam para Cloudflare (104.21.90.184 / 172.67.203.210).

### Correção: Painel Admin não salvava alterações

**Problema**: "Parar votação", "Iniciar votação" e edição de equipes/provas no painel admin não funcionavam.

**Causa raiz** (`src/app/api/state/route.ts`):
- `checkSupabaseAvailable()` verificava apenas se a API REST do Supabase estava acessível (fetch), e retornava `true`.
- Quando `true`, o código tentava escrever no Supabase usando a **anon key**.
- A anon key tem permissão apenas de leitura (RLS) — writes falhavam **silenciosamente** (sem checar `error` no retorno).
- `GET()` então lia de volta os dados **antigos** do Supabase, e o painel parecia não salvar.

**Solução**:
- POST `updateState` agora **sempre escreve no JSON primeiro** (`gincana-state.json`) como armazenamento primário.
- Sincronização com Supabase é **best-effort**: tenta escrever, e se falhar (RLS ou qualquer erro), ignora — dados já estão no JSON.
- `GET()` agora **lê do JSON como fonte primária** para estado, times, provas, jurados.
- Scores (votos ao vivo via RPC) ainda vêm do Supabase quando disponível, com fallback pro JSON.

### Files Changed
- `src/app/api/state/route.ts` — rewrite do `updateState` e `GET` handlers
- `src/app/admin/jurados/page.tsx` — auth check adicionado
- `AGENTS.md` — pendências marcadas como resolvidas

### Sessão 2 (24/06 — continuação)

#### Melhorias no Telão (Projetor)
- **Modo projetor** (`src/app/globals.css`): Adicionado `.screen-mode` com fundo claro sólido, cards opacos (sem blur), cores mais saturadas, contraste elevado (`--text-secondary: #3a3a4a`).
- **Fontes maiores**: Título 4.5rem, status 3.2rem, nomes 2.2rem, scores 3.5rem, barras 85px.
- **Cores do cabeçalho**: "2026" em amarelo (`var(--yellow-brazil)`), "INSTITUTO EDUCACIONAL LOGOS" e "REDENÇÃO-CE" em azul escuro.
- **Responsivo**: Breakpoints 768px e 480px ajustados para o `.screen-mode`.

#### Correções
- **Jurado page** (`src/app/jurado/page.tsx`): Agora verifica `data.status === 'active'` além de `activeProva` — se votação estiver pausada, mostra "Votação Pausada" em vez do painel de notas.
- **Vote page** (`src/app/vote/page.tsx`): Botões das equipes `height: 80px` → `height: 5rem` (min 60px) — escala com a fonte.

#### Responsividade Geral
- **Home** (`src/app/page.tsx`): `flexWrap: wrap` na row inferior (ShareButton + Área Restrita).
- **Admin/Jurados** (`src/app/admin/jurados/page.tsx`): `flexWrap: wrap` no formulário, input com `minWidth: 180px`.
- **Globals**: `@media (prefers-reduced-motion: reduce)` — desliga animações para usuários com sensibilidade.
- **Layout** (`src/app/layout.tsx`): `viewport` export explícito (`width=device-width, initial-scale=1`).

#### Deploy
- Várias rodadas de commit + push + pull na VPS com PM2 restart.
- Conflitos no `vote/page.tsx` e `gincana-state.json` resolvidos via `git stash`/`checkout --theirs`.

### Files Changed (Sessão 2)
- `src/app/globals.css` — `.screen-mode`, `prefers-reduced-motion`, breakpoints
- `src/app/screen/page.tsx` — modo projetor, cores do cabeçalho
- `src/app/vote/page.tsx` — altura dos botões em rem
- `src/app/page.tsx` — flexWrap na home
- `src/app/admin/jurados/page.tsx` — flexWrap no formulário
- `src/app/layout.tsx` — viewport export

## 2026-06-24 (Sessão 3 — Segurança)

### Mudanças

- **Otimização do voto** (`src/app/api/state/route.ts`): Vote e juryVote refatorados para salvar no **JSON primeiro** (como `updateState`), Supabase sync é best-effort. Latência do voto caiu de **7.1s → 186ms** (p95).

- **Rate limiting** (`src/app/api/state/route.ts`): Map in-memory com sliding window de 3s, max 2 requisições de vote/juryVote por IP. Retorna HTTP 429. Cleanup automático a cada 5 min.

- **CSRF protection** (`src/app/api/state/route.ts`, `src/app/api/resultados/route.ts`): POSTs de `updateState`, `reset`, `clear` só aceitos se `Origin` ou `Referer` bater com hosts permitidos. Retorna HTTP 403.

- **PIN brute-force protection** (`src/app/api/auth/pin/route.ts`): Max 5 tentativas de PIN a cada 10s por IP. Retorna HTTP 429.

- **Cookie hardening** (`src/app/api/auth/login/route.ts`): Cookies `admin_verified`/`jurado_verified` agora com `Secure` (só HTTPS) e `SameSite=Lax`.

- **Cloudflare Turnstile CAPTCHA** (invisível/Non-interactive):
  - Layout (`src/app/layout.tsx`): Script `turnstile/v0/api.js` carregado com `lazyOnload`.
  - Vote page (`src/app/vote/page.tsx`): Widget Turnstile renderizado via `window.turnstile.render()`, token enviado no POST junto com o voto. Modo Non-interactive (spinner visível durante verificação).
  - Backend (`src/app/api/state/route.ts`): Valida token via `siteverify` da Cloudflare. Bloqueia votos com token inválido/expirado (HTTP 403).
  - `.env.local`: Adicionado `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` (configurados na VPS).

### Files Changed
- `src/app/api/state/route.ts` — rate limit, CSRF, Turnstile validation, vote/juryVote JSON-first
- `src/app/api/auth/login/route.ts` — cookie Secure + SameSite
- `src/app/api/auth/pin/route.ts` — rate limit brute-force
- `src/app/api/resultados/route.ts` — CSRF check
- `src/app/vote/page.tsx` — Turnstile widget visível, spinner no voto
- `src/app/layout.tsx` — Turnstile script
- `.env.local` — Turnstile keys
- `AGENTS.md` — atualizado com novas features de segurança

## 2026-06-25

### Mudanças

- **Turnstile + botões 0-10 nos jurados** (`src/app/jurado/page.tsx`):
  - Substituído slider (range) por **botões numerados 0 a 10** (inteiros), cada um com cor da equipe quando selecionado.
  - Adicionado Turnstile CAPTCHA Non-interactive (banner "Verificando...", sem clique/desafio de imagem), renderizado via `useRef` + `window.turnstile.render()`.
  - Token enviado no body do `fetch('api/state')` para `juryVote`.
  - `declare global` com tipos Turnstile (idêntico ao do `vote/page.tsx`).
  - Exibição de erro do CAPTCHA e reset do widget após cada voto.

- **Backend CAPTCHA** (`src/app/api/state/route.ts`): Validação Turnstile estendida para cobrir também `juryVote` (antes só cobria `vote`).

### Files Changed
- `src/app/jurado/page.tsx` — Turnstile + botões 0-10
- `src/app/api/state/route.ts` — CAPTCHA também para juryVote
- `SESSION_LOG.md` — este log