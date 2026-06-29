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

## Session 2026-06-25

### Changes
- **Turnstile + botões 0-10 nos jurados** (`src/app/jurado/page.tsx`): Slider substituído por botões numerados 0–10 (inteiros). Turnstile Non-interactive adicionado com token enviado no body do `juryVote`. Tipos Turnstile declarados globalmente (idêntico ao `vote/page.tsx`). Reset do widget após cada voto.
- **Backend CAPTCHA** (`src/app/api/state/route.ts`): Validação Turnstile estendida para `juryVote` (antes só `vote`).

### Key Files Changed
- `src/app/jurado/page.tsx` — botões 0-10 + Turnstile
- `src/app/api/state/route.ts` — CAPTCHA para juryVote

## Session 2026-06-26

### Mudanças

- **Auditoria de segurança**: Instaladas skills `security-scan` (jwynia) + `vulnhunter` (sendaifun). Achados: 2 críticos, 5 altos, 5 médios, 5 baixos.
- **Credenciais vazadas**: `.gitignore` corrigido para ignorar `.env.local`; removido do tracking (`git rm --cached`); `.env.local.example` criado como template; senha admin rotacionada.
- **Hardcoded fallbacks removidos**: `login/route.ts` não usa mais `|| 'admin'/'arraiel2026'`; `pin/route.ts` não usa mais `|| '1234'/'5678'` — ambos retornam 500 se env vars/Supabase não configurados.
- **Cookies endurecidos**: `httpOnly: true` em todos os cookies de autenticação; `Secure` simplificado para `proto === 'https'`.
- **PINs mascarados**: Em `admin/jurados/page.tsx`, PINs exibidos como `●●●●`.
- **Auth check endpoint**: Criado `/api/auth/check` que lê cookie server-side; admin pages refatoradas para usá-lo (substitui `document.cookie` quebrado pelo `httpOnly`).
- **Supabase removido**: `@supabase/supabase-js` removido; `supabase.ts` vira stub que sempre retorna `error`; app 100% JSON. Backup na branch `backup-antes-remover-supabase`.
- **Turnstile secret key**: Rotacionada no Cloudflare pelo usuário.
- **Hetzner**: Conta criada, pendente criar servidor CX23 (Ubuntu 24.04, Nuremberg).

### Key Files Changed
- `.gitignore` — agora ignora `.env.local`
- `.env.local` — removido do git, nova senha admin, nova Turnstile secret
- `.env.local.example` — template criado
- `src/app/api/auth/login/route.ts` — sem fallback, httpOnly, secure fix
- `src/app/api/auth/pin/route.ts` — sem fallback, httpOnly, secure fix
- `src/app/api/auth/check/route.ts` — novo endpoint
- `src/app/admin/page.tsx` — auth via /api/auth/check
- `src/app/admin/jurados/page.tsx` — PINs mascarados, auth via /api/auth/check
- `src/app/admin/resultados/page.tsx` — auth via /api/auth/check
- `src/lib/supabase.ts` — stub (sempre unavailable)
- `package.json` — @supabase/supabase-js removido
- `SESSION_LOG.md` — atualizado

## Session 2026-06-29

### Changes
- **Hetzner como servidor principal**: `www.institutoeducacionallogos.online` migrado para Hetzner CX23 (4GB RAM). Oracle vira fallback.
- **Correção Cloudflare 404**: `/etc/cloudflared/config.yml` usava `hetzner.*` em vez de `www.*` — ingress rule corrigida.
- **Regra 100%/0%**: Jurados concordam → vencedor leva tudo; discordam → público decide.
- **P7/P8 externalResult**: Barracas e Rifas sem votação, admin insere valores.
- **State**: 2 equipes (VERDE/AMARELO), 8 provas 1º dia, 2 jurados.

### Key Files Changed
- `src/app/api/state/route.ts` — finalizeProva, externalResult, manualWinner, reopenProva
- `src/app/jurado/page.tsx` — escolha binária do time vencedor
- `src/app/admin/page.tsx` — pontos, externalResult, Calcular Resultado
- `src/app/vote/page.tsx` — mensagem "Prova sem votação" para externalResult
- `gincana-state.json` — 8 provas configuradas
- `SESSION_LOG.md` — atualizado

### Performance Note
- Sessão lenta devido a múltiplos SSH + deploys remotos para Hetzner.
- Usuário reportou latência alta nas respostas.

## Session 2026-06-28

### Changes
- **Sonoplastia** (`src/hooks/useSound.ts`): Web Audio API — `voteConfirm`, `juryVote`, `resultsReveal`, `timerBeep`, `timerWarning`. Zero bundle.
- **Timer/Cronômetro** (`src/components/Timer.tsx`): Contagem regressiva com cor verde/amarelo/vermelho. Duração por prova (`prova.timer`). Auto-inicia quando `status === 'active'`.
- **Exportar CSV** (`src/app/admin/dashboard/page.tsx`): Botão de download com BOM UTF-8, por prova.
- **Oracle swap**: 1GB → **3GB** (persistente) para build caber.
- **Deploy ambos**: Oracle e Hetzner rodando as novas features.

### Key Files Changed
- `src/hooks/useSound.ts` — novo
- `src/components/Timer.tsx` — novo
- `src/app/admin/page.tsx` — timer + editar timer da prova
- `src/app/admin/dashboard/page.tsx` — ranking + CSV export
- `src/app/vote/page.tsx` — som + timer
- `src/app/jurado/page.tsx` — som + timer
- `src/app/api/state/route.ts` — timer auto-start + historico logging
- `src/app/api/dashboard/route.ts` — agregador
- `src/app/api/historico/route.ts` + `admin/historico/page.tsx` — histórico votação
- `SESSION_LOG.md` — atualizado

