# Vxture Umbra

Production overseas edge entry node — SNI routing, VLESS+REALITY proxy, subscription delivery, password management, status monitoring.

**Stack:** Nginx · Xray REALITY · Marzban · PostgreSQL · Vaultwarden · Uptime Kuma · Shlink

---

## Services

| Domain | Service |
|--------|---------|
| `ruyin.ai` / `www.ruyin.ai` | Brand landing page |
| `vpn.ruyin.ai` | VPN Portal (user onboarding) |
| `sub.ruyin.ai` | Marzban subscriptions |
| `console.ruyin.ai` | Marzban admin *(VPN access only)* |
| `vault.ruyin.ai` | Vaultwarden |
| `status.ruyin.ai` | Uptime Kuma |
| `docs.ruyin.ai` | Documentation |
| `go.ruyin.ai` | Short links |

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Ubuntu 22.04 LTS | Tested on 2C2G / 40GB SSD |
| Docker + docker compose v2 | Installed by `server-init.sh` |
| DNS A records | All 9 domains → server IP |
| Open ports | 80, 443 |

---

## Deployment

### 1. Bootstrap the server (as root, once)

```bash
bash scripts/server-init.sh
```

Installs Docker, creates admin user `stone` (sudo + docker), copies SSH keys, disables root SSH. Safe to re-run.

### 2. Clone and configure (as the admin user)

```bash
git clone https://github.com/vxture/umbra.git /srv/vxture/repo/umbra
cd /srv/vxture/repo/umbra
cp .env.example .env
nano .env
```

Fill in all required values:

```bash
# Passwords — generate with: openssl rand -base64 32
MARZBAN_ADMIN_USER=admin
MARZBAN_ADMIN_PASSWORD=<strong-password>
CONSOLE_HTPASSWD_PASSWORD=<strong-password>
POSTGRES_PASSWORD=<strong-password>
POSTGRES_MARZBAN_PASSWORD=<strong-password>
POSTGRES_VAULTWARDEN_PASSWORD=<strong-password>
POSTGRES_SHLINK_PASSWORD=<strong-password>

# Admin token — generate with: openssl rand -base64 48
VAULTWARDEN_ADMIN_TOKEN=<token>

# Email for Let's Encrypt notifications
CERTBOT_EMAIL=your@email.com

# Debug without DNS: set true to use self-signed certs (upgrade later)
CERTBOT_SKIP=false
```

### 3. Point DNS to this server

All 9 A records must resolve to the server's public IP before cert issuance.
Verify: `dig +short vpn.ruyin.ai`

If DNS is not ready yet, set `CERTBOT_SKIP=true` in `.env` to use self-signed certs and deploy anyway. Upgrade later with `deploy-certs.sh --upgrade`.

### 4. Deploy

```bash
bash scripts/deploy-all.sh
```

Runs all steps in order — idempotent, safe to re-run:

| Step | Script | Action |
|------|--------|--------|
| 00 | `steps/00-check-env.sh` | Validate env vars, Docker, DNS, ports |
| 01 | `steps/01-init-dirs.sh` | Create data directory structure |
| 02 | `steps/02-generate-reality.sh` | Generate REALITY x25519 keypair *(skips if exists)* |
| 03 | `steps/03-issue-certs.sh` | Issue Let's Encrypt certs *(skips if valid >30d)* |
| 03 | `steps/03-self-signed.sh` | Self-signed certs *(when `CERTBOT_SKIP=true`)* |
| 04 | `steps/04-render-configs.py` | Render all templates → `DATA_DIR` |
| 05 | `steps/05-up.sh` | Pull images and start all containers |
| 06 | `steps/06-verify.sh` | Verify endpoints, containers, certs, databases |
| 07 | `steps/07-backup.sh` | Create initial backup |

### 5. Post-deploy wizard

```bash
bash scripts/deploy-post.sh
```

Interactive wizard:
1. Create Marzban VPN users (prompts for count and prefix)
2. Display and save subscription URLs
3. Show DNS status for all domains
4. Guide Vaultwarden account creation and signup lockdown

### 6. Upgrade to real TLS certificates

After all DNS records point to the server:

```bash
bash scripts/deploy-certs.sh --upgrade
```

This verifies DNS, removes self-signed certs, issues real Let's Encrypt certs, and reloads Nginx.

---

## Operations

### Certificate management

```bash
bash scripts/deploy-certs.sh              # run renewal check (also runs daily via cron)
bash scripts/deploy-certs.sh --upgrade    # replace self-signed with real LE certs
bash scripts/deploy-certs.sh --status     # show cert expiry for all domains
```

### Reset and re-deploy

```bash
# Soft reset: stop containers, free ports (data preserved)
bash scripts/server-reset.sh

# Full reset: destroy all data (requires typing YES)
bash scripts/server-reset.sh --full

# Then re-deploy
bash scripts/deploy-all.sh
```

### Backup and logs

```bash
# Manual backup
bash scripts/steps/07-backup.sh

# View logs
docker compose logs -f umbra-nginx
docker compose logs -f umbra-marzban

# Restart a service
docker compose restart umbra-nginx
```

---

## Migration (DNS cutover)

If migrating from an existing server:

1. Lower DNS TTL to 60s (ideally 24h in advance)
2. Deploy new server with `CERTBOT_SKIP=true`
3. Test all services
4. Update DNS → new server IP
5. Run `bash scripts/deploy-certs.sh --upgrade` to issue real certs
6. Run `bash scripts/deploy-post.sh` to create users and distribute subscription URLs

---

## Scripts

| Script | Purpose |
|--------|---------|
| `server-init.sh` | Server bootstrap (root, once) |
| `server-reset.sh` | Stop or wipe deployment |
| `deploy-all.sh` | Full deployment orchestrator |
| `deploy-certs.sh` | Certificate lifecycle (renew / upgrade / status) |
| `deploy-post.sh` | Post-deploy wizard (users, DNS check, Vaultwarden) |
| `steps/06-verify.sh` | Verify all services and endpoints |
| `steps/07-backup.sh` | Backup databases and configs |

## Docs

See [`docs/agent.md`](docs/agent.md) for architecture and design reference.
