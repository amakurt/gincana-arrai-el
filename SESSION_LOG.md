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