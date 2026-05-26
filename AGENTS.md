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

### Credenciais (`.env.local`)
- Admin: `admin` / `arraiel2026`
- PIN Admin: `1234`
- PIN Jurado: `5678`
- Supabase URL/Key no `.env.local`

