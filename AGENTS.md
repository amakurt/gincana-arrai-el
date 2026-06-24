<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Session 2026-05-25

### Changes
- **Logo watermark**: Removed from top-center, now full-screen repeating pattern of small logos (opacity 8%, staggered brick layout with pseudo-random rotation + `balanco` animation like bandeirinhas)
- **Dark mode contrast**: Added `--logo-bg` / `--logo-ring` CSS vars; raised `--grass-dark` from `#071207` → `#4a8c4a`; bumped `--text-secondary` from `#94a3b8` → `#a0b4c8`; `--bg-card` from `0.04` → `0.06`; replaced all hardcoded `rgba(255,255,255,0.4)` logo backgrounds with `var(--logo-bg)` + outline ring
- **Screen layout**: Prova/status card centered, bigger (padding `2rem 5rem`, title `1.5rem`, status `2.8rem`); ShareButton moved below results; "VOTAÇÃO ABERTA" uses `var(--blue-brazil)`
- **Share modal**: Replaced direct Web Share API with full modal (WhatsApp, Instagram copy, Facebook, X/Twitter, Copiar link); feedback works on HTTP (no clipboard) via `setCopied(true)` before clipboard attempt
- **Hydration fix**: `suppressHydrationWarning` on `<html>`; `shareUrl` moved to `useEffect` + state
- **Responsive**: Media queries at 768px/480px for screen page; classes `screen-*` shrink fonts, paddings, bar heights, logo; header stacks on mobile
- **Git**: `.gitignore` changed from `.env*` to only `.env.local.example`; `.env.local` committed with creds

### Key Files Changed
- `src/app/globals.css` — dark theme vars, responsive classes, `.logo-watermark` animation
- `src/app/layout.tsx` — watermark pattern, `suppressHydrationWarning`
- `src/app/screen/page.tsx` — centered card, responsive classes, share below results, blue status text
- `src/components/ShareButton.tsx` — modal with social links, clipboard feedback
- `src/app/page.tsx`, `vote/page.tsx`, `login/page.tsx`, `admin/page.tsx`, `jurado/page.tsx` — logo bg vars
- `.gitignore`, `.env.local` — committed to repo

## Session 2026-05-26

### Changes
- **Show password fix** (`src/app/login/page.tsx`): Botão "mostrar senha" tinha z-index insuficiente e faltava `top: 50% / translateY(-50%)`, ficando fora da área clicável. Corrigido com `width/height: 40px`, `zIndex: 2`, centralização vertical. Ícone do cadeado recebeu `pointerEvents: 'none'`.

- **Login flash fix** (`src/app/login/page.tsx`, `src/app/admin/page.tsx`):
  - Login: adicionado `loggedIn` flag para evitar `setLoading(false)` depois de login bem-sucedido (botão voltava a "ENTRAR NO PAINEL" antes da navegação). Trocado `router.push` por `router.replace`.
  - Admin page: adicionado estado `checkingAuth` + `return null` enquanto verifica sessionStorage, eliminando o flash de "Carregando painel admin..." antes do redirect para `/login` em usuários não autenticados.

- **Acesso por IP da rede** (`next.config.ts`): Adicionado `192.168.20.54` ao `allowedDevOrigins` para permitir acesso ao dev server pelo IP da máquina.

### Pendente / Sugestões
- **Deploy**: Hospedar em VPS (Hetzner CX22 ~€4/mês ou DigitalOcean $6/mês) com Nginx reverse proxy. Supabase free tier cobre o banco. Pico estimado: 500 acessos simultâneos — 1-2 vCPU + 2GB RAM é suficiente.
- **Site da escola + gincana**: Pode rodar ambos no mesmo VPS com Nginx roteando por domínio/subdomínio.
- **Admin/jurados page** (`src/app/admin/jurados/page.tsx`): Não tem verificação de `admin_verified` — qualquer um pode acessar se souber a URL.

## Session 2026-06-16

### Progresso Deploy — Oracle Cloud VPS

- [x] Conta Oracle criada
- [x] VCN `vcn-gincana` criada (CIDR `10.0.0.0/16`)
- [x] Sub-rede pública `subrede-publica` criada (CIDR `10.0.1.0/24`)
- [x] Instância Compute criada (Ubuntu 24.04, IP público: `137.131.160.171`)
- [x] Security List: portas 22 e 80 liberadas
- [x] Internet Gateway `igw-gincana` + rota padrão 0.0.0.0/0
- [x] SSH conectado com chave em `~/.ssh/oracle-gincana.key`
- [x] Node.js 22 + npm instalados
- [x] Repositório clonado do GitHub
- [x] Build do Next.js bem-sucedido
- [x] PM2 configurado (processo `gincana`)
- [x] Nginx configurado como proxy reverso (porta 80 → 3000)
- [x] iptables liberado (portas 80 e 443) e persistido
- [ ] **Pendente**: Configurar domínio + SSL (HTTPS)

### Credenciais (`.env.local`)
- Admin: `admin` / `arraiel2026`
- PIN Admin: `1234`
- PIN Jurado: `5678`
- Supabase URL/Key no `.env.local`

## Session 2026-06-18

### Otimizações de Performance — VPS Oracle

- **Swap**: 1GB swap file adicionado
- **PM2**: 2 instâncias fork (portas 3000 + 3001) com `ecosystem.config.js`, `NODE_OPTIONS='--max-old-space-size=400'`
- **Nginx**: `upstream` com `least_conn` + `proxy_cache` para assets estáticos (1 ano) e home (60 min)
- **Capacidade estimada**: ~200-400 usuários simultâneos (gargalo: Supabase 100 conexões)

### Próximos passos sugeridos (prioridade)
1. **HTTPS**: Instalar Cloudflare Tunnel (`cloudflared`) como solução temporária OU registrar domínio de novo no Registro.br confirmando o email
2. **Domínio definitivo**: `institutoeducacionallogos.com.br` — precisa registrar no Registro.br e validar o cadastro no link por email
3. **Cloudflare**: Após domínio aprovado, criar conta no Cloudflare, configurar DNS e SSL
4. **Supabase upgrade**: Plano Pro ($25/mês) se necessidade futura
5. **Admin/jurados page**: Falta verificação `admin_verified` (`src/app/admin/jurados/page.tsx`)

## Session 2026-06-23

### Mudanças

- **HTTPS via Cloudflare Tunnel**: Já estava configurado e rodando. Domínio `www.institutoeducacionallogos.online` com SSL. O tunnel roteia direto pra `localhost:3000`, bypassando Nginx.
- **Login redirect fix** (`src/app/api/auth/login/route.ts`, `src/app/login/page.tsx`, `src/app/admin/page.tsx`):
  - Login mudado de `fetch` + `window.location.href` para **form POST tradicional** com redirect server-side (307).
  - API route agora aceita `application/x-www-form-urlencoded` (form) e `application/json`.
  - Em vez de `sessionStorage`, usa **cookies** (`admin_verified`, `jurado_verified`) setados via `response.cookies.set()`.
  - Admin page lê cookies (`getCookie()`) em vez de `sessionStorage`.
  - Resolve o erro "This page couldn't load" no Chrome após login.
- **Home page sem Telão** (`src/app/page.tsx`): Removido link para `/screen` da página inicial. Acesso ao telão só pelo painel admin.
- **Botão "VER PLACAR COMPLETO"** (`src/app/vote/page.tsx`): Após votar, mostra botão que abre o telão (`/screen`) em nova aba.

### Pendente (Resolvido)
- ~~**Admin/jurados page** (`src/app/admin/jurados/page.tsx`): Sem verificação de `admin_verified` — qualquer um pode acessar.~~ ✅ Adicionado cookie check `admin_verified` com redirect pra `/login`.
- ~~**Domínio raiz** (`institutoeducacionallogos.online` sem `www`): Aponta pro IP errado (`162.240.81.81`), não pro VPS.~~ ✅ DNS já foi corrigido — ambos os domínios apontam para Cloudflare (104.21.90.184 / 172.67.203.210).

## Session 2026-06-24

### Correção: Painel Admin não salvava alterações

**Problema**: "Parar votação" e edição de equipes/provas no painel admin não funcionavam.

**Causa raiz** (`src/app/api/state/route.ts`):
- `checkSupabaseAvailable()` verificava apenas se a API REST do Supabase estava acessível (fetch), retornando `true`.
- Quando `true`, o código tentava escrever no Supabase usando a **anon key**.
- A anon key tem permissão apenas de leitura (RLS) — writes falhavam **silenciosamente** (sem checar `error`).
- `GET()` lia de volta os dados **antigos** do Supabase — painel parecia não salvar.

**Solução**:
- POST `updateState` **sempre escreve no JSON primeiro** como armazenamento primário.
- Sincronização com Supabase é **best-effort** (ignora erros).
- `GET()` **lê do JSON como fonte primária** para estado, times, provas, jurados.
- Scores (votos ao vivo via RPC) ainda vêm do Supabase quando disponível.

### Files Changed
- `src/app/api/state/route.ts` — rewrite do `updateState` e `GET`
- `src/app/admin/jurados/page.tsx` — auth check
- `SESSION_LOG.md`, `AGENTS.md` — logs

## Session 2026-06-24 (Security)

### Mudanças

- **Voto otimizado**: Vote/juryVote salvam no JSON primeiro (como `updateState`). Latência caiu de **7.1s → 186ms**.
- **Rate limiting**: Map in-memory, max 2 vote/jury per IP a cada 3s (HTTP 429). Cleanup a cada 5 min.
- **CSRF check**: POSTs de `updateState`/`reset`/`clear` validam Origin/Referer contra hosts permitidos (HTTP 403).
- **PIN brute-force**: Max 5 tentativas por IP a cada 10s no `/api/auth/pin` (HTTP 429).
- **Cookie hardening**: `Secure` + `SameSite=Lax` nos cookies admin/jurado.
- **Cloudflare Turnstile**: CAPTCHA invisível na votação. Widget renderizado via `window.turnstile.render()` no vote page. Token validado via `siteverify` no backend. Chaves configuradas no `.env.local` da VPS.

### Files Changed
- `src/app/api/state/route.ts` — rate limit, CSRF, Turnstile, vote JSON-first
- `src/app/api/auth/login/route.ts` — cookie Secure + SameSite
- `src/app/api/auth/pin/route.ts` — rate limit brute-force
- `src/app/api/resultados/route.ts` — CSRF check
- `src/app/vote/page.tsx` — Turnstile widget, loading spinner
- `src/app/layout.tsx` — Turnstile script
- `.env.local` — Turnstile keys
- `load-test-k6.js` — load test k6 script

