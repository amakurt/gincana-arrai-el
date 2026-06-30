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

## 2026-06-26

### Análise de Vulnerabilidades (security-scan + vulnhunter)

- **CRÍTICO**: `.env.local` commitado com credenciais — corrigido (`.gitignore` agora ignora `.env.local`, `git rm --cached`)
- **CRÍTICO**: Turnstile secret key exposta — usuário rotacionou no Cloudflare
- **HIGH**: Fallback de credenciais hardcoded removido (`login/route.ts` — retorna 500 se env vars faltando)
- **HIGH**: PINs hardcoded (`1234`/`5678`) removidos (`pin/route.ts` — retorna 500 se não configurado)
- **HIGH**: `httpOnly: true` nos cookies de autenticação (login + pin)
- **HIGH**: Senha admin rotacionada para hash forte
- **HIGH**: PINs dos jurados mascarados na interface (`●●●●`)
- **HIGH**: `Secure` cookie simplificado (`secure = proto === 'https'`)
- **MEDIUM**: Criado endpoint `/api/auth/check` para verificar cookie httpOnly server-side
- **MEDIUM**: Admin pages refatoradas para usar `/api/auth/check` em vez de `document.cookie`
- **MEDIUM**: `getCookie()` removido de admin pages

### Supabase Removido

- `@supabase/supabase-js` removido do `package.json` (9 pacotes a menos)
- `src/lib/supabase.ts` reescrito como stub — toda chamada retorna `error`, JSON fallback
- App 100% auto-suficiente, sem dependência externa
- Backup criado na branch `backup-antes-remover-supabase`

### Deploy VPS

- Commit e push para GitHub
- Pull, build, PM2 restart na Oracle VPS
- Nova senha admin: `4f1ca7004c2af552610104fb70527d7b3fda80d22ee3aa4b`
- Turnstile secret key rotacionada

### Pendente

- ~~Conta Hetzner criada~~ — aguardando criação do servidor (CX23, Ubuntu 24.04, Nuremberg)
- Após Hetzner ativo: configurar Node.js, clonar repo, build, PM2, Cloudflare Tunnel
- Opcional: rotacionar Supabase anon key
- Opcional: configurar domínio definitivo `institutoeducacionallogos.com.br`
## Session 2026-06-27

### Mudanças

- **Servidor Hetzner CX23 criado**: Nuremberg, 2 vCPU, 4GB RAM, Ubuntu 24.04. IP: `23.88.58.41`
- **Node.js 22.23.1** instalado, repo clonado do GitHub, build Next.js bem-sucedido
- **PM2** com `ecosystem.config.js`, `NODE_OPTIONS='--max-old-space-size=800'`
- **Nginx** configurado como proxy reverso (porta 80 → 3000) com cache de assets (1 ano) e home (60 min)
- **Cloudflare Tunnel** (`gincana-hetzner`): `hetzner.institutoeducacionallogos.online` → localhost:80
- **Swap 1GB** adicionado e persistido
- **Firewall (UFW)** ativo: portas 22 e 3000 liberadas

### Comparativo Oracle vs Hetzner

| Item | Oracle | Hetzner |
|------|--------|---------|
| CPU | 1 vCPU (AMD) | **2 vCPU** (Intel) |
| RAM | 1GB | **4GB** |
| Swap | 1GB | **1GB** |
| Node memory | 400MB | **800MB** |
| Cache | Nginx | **Nginx** |
| Tunnel | Cloudflare | **Cloudflare** |
| Domínio | `www.institutoeducacionallogos.online` | `hetzner.institutoeducacionallogos.online` |

### Pendente

- Migrar `institutoeducacionallogos.com.br` para Cloudflare + apontar pro Hetzner (DNS leva ~3 dias)
- `institutoeducacionallogos.store` já está na Cloudflare (nameservers Cloudflare)

## Session 2026-06-28

### Novas Features

- **Sonoplastia** (`src/hooks/useSound.ts`): Hook `useSound` com Web Audio API — sons de `voteConfirm`, `juryVote`, `resultsReveal`, `timerBeep`, `timerWarning`. Zero bundle adicional (sem arquivos de áudio). Usado em `vote/page.tsx` (som ao votar), `jurado/page.tsx` (som ao pontuar), `admin/dashboard/page.tsx` (revelar resultados).

- **Timer/Cronômetro** (`src/components/Timer.tsx`): Componente de contagem regressiva com urgência por cor (verde >60s, amarelo 30-60s, vermelho <30s). Duração por prova (`prova.timer` em segundos). Auto-inicia quando status vira `active` (`timerStartedAt: Date.now()`). Exibido no admin, vote page e jurado page.

- **Exportar Resultados (CSV)** (`src/app/admin/dashboard/page.tsx`): Botão de download CSV com BOM (UTF-8 para Excel). Exporta desagregado por prova + nota geral de cada equipe.

### Deploy Ambos Servidores

- **Oracle**: Swap aumentado de 1GB → **3GB** (persistente em `/etc/fstab`) para build caber nos 954MB de RAM. Build + PM2 restart bem-sucedido.
- **Hetzner**: Git pull + npm install + build + PM2 restart bem-sucedido.
- Ambos respondendo 200: `www.institutoeducacionallogos.online` e `hetzner.institutoeducacionallogos.online`

### Files Changed
- `src/hooks/useSound.ts` — novo
- `src/components/Timer.tsx` — novo
- `src/app/admin/page.tsx` — timer no admin, editar timer da prova, export CSV na dashboard
- `src/app/admin/dashboard/page.tsx` — ranking + gráficos + CSV export
- `src/app/vote/page.tsx` — som + timer component
- `src/app/jurado/page.tsx` — som + timer component
- `src/app/api/state/route.ts` — timer auto-start + historico logging
- `src/app/api/dashboard/route.ts` — agregador de dados
- `src/app/api/historico/route.ts` + `src/app/admin/historico/page.tsx` — histórico de votação
- `SESSION_LOG.md` — este log

## Session 2026-06-29

### Changes (Parte 1)
- **Hetzner como servidor principal**: `www.institutoeducacionallogos.online` migrado para Hetzner CX23 (Nuremberg, 4GB RAM). Oracle vira fallback (`hetzner.institutoeducacionallogos.online`).
- **Correção Cloudflare 404**: `/etc/cloudflared/config.yml` no Hetzner usava `hetzner.*` em vez de `www.*` — corrigido.
- **Regra de pontuação ajustada**: Jurados discordam → público decide (100%/0%, não 50/50).
- **P7/P8 externalResult**: Barracas e Rifas sem votação, admin insere valores.

### Changes (Parte 2) — HA Failover Hetzner + Oracle
- **Problema**: DNS `www.*` tinha CNAME apontando pro tunnel `gincana-hetzner`, que foi deletado — site retornava erro Cloudflare 1033/530.
- **Causa**: Ambos servidores tinham tunnels separados com o mesmo hostname (`www.*`). Quando o tunnel do Hetzner parava, Cloudflare ainda tentava rotear pra ele.
- **Solução**: Tunnel único `ha-gincana` (ID `cc818b66`) rodando em **ambos servidores simultaneamente** (HA — High Availability).
  - Cloudflare distribui tráfego entre as conexões dos dois servidores.
  - Se um cair, o outro assume automaticamente (failover testado: ~180ms, sem downtime).
- **DNS atualizado**: `www.*`, bare domain, e `hetzner.*` apontam via CNAME para `ha-gincana`.
- **Tunnels antigos deletados**: `gincana` (Oracle) e `gincana-hetzner` (Hetzner).

### Failover Testado
1. Tunnel `ha-gincana` rodando em ambos servidores (8 conexões totais)
2. Cloudflared parado no Hetzner → site continuou 200 via Oracle em ~180ms
3. Cloudflared religado no Hetzner → HA restaurada

### Comandos Úteis (Backup)
```bash
# Se um servidor falhar, o outro já está servindo. Nada a fazer.
# Para religar o servidor caído:
ssh root@<IP> "systemctl start cloudflared"
```

### Key Files Changed
- `SESSION_LOG.md` — este log

## Session 2026-06-29 (Parte 3)

### Changes
- **PIN hash não vaza na edição** (`src/app/admin/jurados/page.tsx`): Ao editar jurado, `editPin` inicia vazio em vez de mostrar o hash. Se o admin não preencher novo PIN, o antigo é preservado (`...(editPin ? { pin: editPin } : {})`).
- **PIN exibido como ●●●● fixo** (`src/app/admin/jurados/page.tsx`): `'●'.repeat(4)` em vez de `'●'.repeat(j.pin.length)` que repetia 129 dots do hash.
- **Jurado page agora lista todas as provas** (`src/app/jurado/page.tsx`): Substituída tela única de votação por 3 seções: 🟢 Em Andamento, ✅ Provas Realizadas (com voto do jurado e vencedor), 📋 Próximas Provas.
- **Resultados page: campos faltando** (`src/app/api/state/route.ts`): `saveSnapshot` agora salva `publicScore` (= `publicVotes`) e `total` (= `pointsAwarded[team.id]`). Resultados antigos corrigidos via script no Oracle e copiados pro Hetzner para consistência HA.
- **Botão "VER PLACAR COMPLETO" removido** do `/vote` (3 ocorrências: aguardando, sem votação, e após votar).
- **Mensagem "Votação Pausada/Encerrada" → "Votação Encerrada"** no admin ao parar votação.
- **Resetar Votação agora funciona** (`src/app/api/state/route.ts`, `src/app/vote/page.tsx`): 
  - Server persiste `voterResetAt` no `gincana-state.json` e limpa `VOTED_VOTERS` Map.
  - Cliente compara `data.voterResetAt` com `localStorage.getItem('voted_reset_${provaId}')`. Se diferente, limpa o voto antigo e permite votar de novo.
- **Removido Resultado Parcial** do `/vote` (gráfico de barras pós-voto).
- **Removidos imports não utilizados**: `motion` (framer-motion), `Trophy` (lucide-react), variáveis `sortedTeams`/`maxVotes`/`scores` do vote page.

### Key Files Changed
- `src/app/admin/jurados/page.tsx` — PIN vazio na edição, ●●●● fixo
- `src/app/jurado/page.tsx` — lista completa de provas em 3 seções
- `src/app/api/state/route.ts` — `publicScore`/`total` no saveSnapshot, `voterResetAt`, `resetVoters` action
- `src/app/vote/page.tsx` — remove VER PLACAR COMPLETO, remove Resultado Parcial, detecta voterResetAt
- `src/app/admin/page.tsx` — botão RESETAR VOTAÇÃO, mensagem "Votação Encerrada"
- `SESSION_LOG.md` — este log

## Session 2026-06-29 (Parte 4 — Interrompida e Recuperada)

### Changes
- **Sistema de pontuação reformulado** (`src/app/api/state/route.ts`): De winner-takes-all para distribuição proporcional. Cada jurado: 300 pts pro escolhido, 150 pro outro. Média dos jurados = 70% da nota. Voto popular = 30%. Desempate por público. `externalResult` também distribui proporcional (baseado no valor arrecadado).
- **Página Resultado Final** (`src/app/final/page.tsx`): Nova página com campeão, ranking completo, detalhamento por prova (público, votos dos jurados, pontos). Suporte a impressão/PDF. Botão no admin e no telão (quando todas as provas finalizadas).
- **Histórico** (`src/app/admin/historico/page.tsx`): Filtro por prova (dropdown), botão Imprimir, exibe apenas `public` e `jury_pick`.
- **Ajustes**: Vote/jurado pages — Turnstile retry loop 25→6, polling 2s/3s, `mutate()` pós-voto, container Turnstile movido pra cima no vote. Reset de provas preserva `externalResult`.

### Key Files Changed
- `src/app/api/state/route.ts` — `calculateProvaPoints` rewrite, `getPublicVotes`, `externalResult` proportional
- `src/app/final/page.tsx` — novo
- `src/app/admin/historico/page.tsx` — filtro prova, imprimir
- `src/app/admin/page.tsx` — botão Resultado Final
- `src/app/screen/page.tsx` — banner Resultado Final
- `src/app/vote/page.tsx` — Turnstile retry, try/catch, container position
- `src/app/jurado/page.tsx` — Turnstile retry, polling 2s

## Session 2026-06-29 (Parte 5)

### Mudanças
- **P8 Rifas agora em unidades** (`gincana-state.json`, `admin/page.tsx`, `final/page.tsx`): Adicionado campo `externalUnit` nas provas (`"R$"` para P7, `"unidades"` para P8). Admin mostra placeholder/label apropriados. Final page exibe como R$ ou inteiro conforme a unidade.

## Session 2026-06-29 (Parte 6) — 1º Dia da Gincana ✅

### Mudanças
- **QR Code da votação** (`public/qrcode-vote.png`): Gerado para `https://institutoeducacionallogos.online/vote` com as cores do tema (azul marinho).

### Deploy
- **Hetzner** e **Oracle** atualizados com `git pull` + `npm run build` + `pm2 restart`.
- JSON dos servidores corrigido com `externalUnit` via SSH.

### Status Final do 1º Dia
- 8 provas configuradas (P7 Barracas R$, P8 Rifas unidades)
- 2 equipes (VERDE/AMARELO)
- 2 jurados
- Pontuação proporcional (70% júri + 30% público)
- Rate limiting, CSRF, Turnstile CAPTCHA ativos
- HA failover entre Hetzner (principal) e Oracle (fallback)

## Session 2026-06-30

### Mudanças

- **Ocultar nomes dos jurados** (global): Adicionado campo `showJuradoNames` no estado (default `false`). Toggle no admin controla visibilidade em todas as páginas.
  - `final/page.tsx`: Colunas "Júri 1"/"Júri 2" em vez de nomes reais
  - `admin/historico/page.tsx`: "Votante" mostra "Júri" em vez do nome
  - `admin/page.tsx`: Card Jurados mostra "Jurado 1"/"Jurado 2" quando oculto; botão toggle no cabeçalho do card

- **Ocultar valores arrecadados** (P7 Barracas): Adicionado `showExternalValues` (default `false`). Toggle no admin. Valores aparecem como `●●●●` no `/final` quando oculto.

- **Deploy Hetzner**: Corrigido merge conflict que deletou `resultados.json` — recuperado do Oracle e regerado do `gincana-state.json`.

- **Impressão compacta**:
  - `/admin/historico`: Fonte 6.5pt, padding reduzido, nomes reais de prova/equipe, cabeçalho de impressão, cores preservadas
  - `/admin/dashboard`: Botão Imprimir adicionado, `print-color-adjust` para cores nas barras, `print-hide-pts` oculta números de pontos na impressão (só barras visíveis)

### Key Files Changed
- `src/app/api/state/route.ts` — `showJuradoNames`, `showExternalValues` fields
- `src/app/admin/page.tsx` — toggles + jurados card hide
- `src/app/final/page.tsx` — hide jurado names + external values
- `src/app/admin/historico/page.tsx` — compact print, hide jurado names
- `src/app/admin/dashboard/page.tsx` — print button + compact styles + hide pts

## Session 2026-06-30 (Parte 2) — Preparação para o Dia 2 🎪

### Mudanças

- **Dia 2 configurado**: 10 novas provas (p9-p18) adicionadas ao `gincana-state.json` sem apagar dados do Dia 1. Tema: "ARRAI-EL SHOW DE BOLA!".

- **3º jurado**: Adicionado j3 em todas as camadas — scores, jury picks, slots, telão, admin, dashboard, resultados, final. Jurado page mapeia index 0→j1, 1→j2, 2→j3.

- **Pontuação Dia 2**: Reformulado `calculateProvaPoints` para ser *day-aware*:
  - **Dia 1** (proporcional): 70% júri + 30% público (preservado)
  - **Dia 2** (100%/50%): 3 jurados, maioria (2+) decide o vencedor. 1º lugar leva 100% dos pontos, 2º lugar 50%. Sem empates possíveis com 3 jurados.

- **Regra de desempate**: Se jurados não chegarem a consenso (<2 votos para o mesmo time), admin é solicitado a definir vencedor manualmente.

- **Instagram (P15)**: Nova ação `instagramResult` — admin insere visualizações por equipe, pontos = visualizações diretamente. Exibido como "views" na página final.

- **externalResult Dia 2**: Barracas (P17) e Rifas (P18) agora usam 100%/50% em vez de distribuição proporcional do Dia 1.

### Provas do Dia 2

| ID | Nome | Pontos | Timer | Tipo |
|----|------|--------|-------|------|
| p9 | 1ª Apresentação Mascote do Time | 300 | 300s | Júri |
| p10 | 2ª Grito de Guerra | 300 | 300s | Júri |
| p11 | 3ª Rei e Rainha do Time | 300 | 300s | Júri |
| p12 | 4ª Cante e Encante | 300 | 300s | Júri |
| p13 | 5ª Dança Típica | 300 | 480s | Júri |
| p14 | 6ª Teatro | 300 | 480s | Júri |
| p15 | 7ª Instagram | views | — | Instagram (external) |
| p16 | 8ª Ornamentação dos Corredores | 300 | — | Júri |
| p17 | 9ª Barracas | 300 | — | External (R$) |
| p18 | 10ª Venda das Rifas | 600 | — | External (unidades) |

### Key Files Changed
- `gincana-state.json` — +10 provas Dia 2, +j3 jurado, novo tema
- `src/app/api/state/route.ts` — j3 everywhere, Day 1/2 scoring split, `instagramResult` action, externalResult day-aware
- `src/app/api/dashboard/route.ts` — j3 no CSV e display
- `src/app/admin/page.tsx` — Instagram UI, 3 jurados, manual winner com 3 slots
- `src/app/jurado/page.tsx` — mapeamento dinâmico j1/j2/j3 por índice
- `src/app/final/page.tsx` — coluna Júri 3, Instagram externalValue display
- `src/app/screen/page.tsx` — j3Pick display na barra
- `src/app/admin/dashboard/page.tsx` — j3 no CSV + exibição
- `src/app/admin/resultados/page.tsx` — coluna Júri 3
- `AGENTS.md`, `SESSION_LOG.md` — logs
