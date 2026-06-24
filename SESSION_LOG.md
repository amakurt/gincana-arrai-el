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