# Restaurar Sistema Gincana Arrai-él 2026

## Dados

### Branch `backup-gincana-completo` (GitHub)
Contém os arquivos de dados do estado final:
- `gincana-state.json` — 18 provas (8 Dia 1 + 10 Dia 2), todas finalizadas
- `resultados.json` — votos públicos + escolhas dos jurados por prova
- `backup-seguimento.json` — backup automático do seguimento

### Arquivo `.tar.gz`
`gincana-complete-backup-2026-07-21.tar.gz` — cópia extra dos arquivos acima + `.env.local`

### `.env.local` (NÃO está no git — apenas no tar.gz)
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=4f1ca7004c2af552610104fb70527d7b3fda80d22ee3aa4b
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADqf72XGbd9_T9Rv
TURNSTILE_SECRET_KEY=0x4AAAAAADqf76YdQ_WORwGGNZNKYl7qN4U
```

## Placar Final

| Equipe  | Dia 1 | Dia 2 | Total |
|---------|-------|-------|-------|
| VERDE   | 1.566 | 1.479 | 3.045 |
| AMARELO | 1.234 | 1.662 | 2.896 |

**Campeã: VERDE** 🏆 (por 149 pontos)

### Jurados
- Wenchelys (j1)
- Wesliany (j2)

## Servidores

### Hetzner (principal, ativo)
- IP: `23.88.58.41`
- Usuário: `root`
- Projeto em: `/root/gincana`
- PM2: processo `gincana` (porta 3000)
- Nginx: proxy reverso 80 → 3000
- Cloudflare Tunnel: `ha-gincana` (HA com Oracle)
- Domínio: `www.institutoeducacionallogos.online`

### Oracle (fallback, inativo/desatualizado)
- IP: `137.131.160.171`
- Usuário: `ubuntu`
- Chave: `~/.ssh/oracle-gincana.key`
- Projeto em: `/home/ubuntu/gincana-arrai-el`
- Dados desatualizados (não finalizados)

## Para restaurar (novo servidor)

### 1. Setup
```bash
git clone https://github.com/amakurt/gincana-arrai-el.git
cd gincana-arrai-el
git checkout backup-gincana-completo
npm install
npm run build
```

### 2. Config
```bash
# Criar .env.local com as credenciais acima
cp .env.local.example .env.local
# Editar .env.local com as credenciais reais
```

### 3. Rodar
```bash
npm start -p 3000
# ou com PM2:
pm2 start npm --name gincana -- start -- -p 3000
```

### 4. Nginx (opcional)
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

### 5. Cloudflare Tunnel (opcional)
```bash
cloudflared tunnel create gincana
cloudflared tunnel route dns gincana seu-dominio.com
```

## Para desativar o Hetzner
```bash
# 1. Parar serviços
pm2 stop gincana
pm2 delete gincana
systemctl stop nginx
systemctl stop cloudflared

# 2. Remover auto-start
systemctl disable nginx
systemctl disable cloudflared
pm2 unstartup

# 3. Backup já feito no branch backup-gincana-completo + tar.gz
```
