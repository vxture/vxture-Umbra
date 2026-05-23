# Vxture Umbra

Production VPN edge node — SNI routing, VLESS+REALITY proxy, subscription delivery, password management, status monitoring.

**Stack:** Nginx · Xray REALITY · Marzban · Vaultwarden · Uptime Kuma · Shlink

---

## Services

| Domain | Service |
|--------|---------|
| `ruyin.ai` / `www.ruyin.ai` | Brand landing page |
| `proxy.ruyin.ai` | VPN user portal |
| `sub.ruyin.ai` | Marzban subscription endpoint |
| `console.ruyin.ai` | Marzban admin *(VPN access only)* |
| `vault.ruyin.ai` | Vaultwarden password manager |
| `status.ruyin.ai` | Uptime Kuma status page |
| `docs.ruyin.ai` | Documentation |
| `go.ruyin.ai` | Shlink short links |

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Ubuntu 22.04 LTS | Vultr or similar; 1C1G minimum, 2C2G recommended |
| SSH key access | Key-based login as root (Vultr adds this at provision time) |
| DNS A records | All 9 domains → server IP, propagated **before** running deploy |
| Open ports | 80 (ACME) and 443 (HTTPS + REALITY) |

> **DNS first.** Let's Encrypt cert issuance is the first blocking step. Point all 9 records before starting.

---

## Initial Server Setup

SSH in as root using the key provided at server creation:

```bash
ssh root@<server-ip>
```

Clone the repo and bootstrap the server (installs Docker, creates admin user, copies SSH keys, disables root SSH):

```bash
git clone https://github.com/vxture/umbra.git /srv/vxture/repo/umbra
bash /srv/vxture/repo/umbra/scripts/server-init.sh
```

`server-init.sh` creates the `stone` admin user (sudo + docker) and copies `/root/.ssh/authorized_keys` to the new user. **Your existing SSH key works for both root and stone.**

---

## Deploy

Open a new SSH session as the admin user:

```bash
ssh stone@<server-ip>
cd /srv/vxture/repo/umbra
```

Configure the environment:

```bash
cp .env.example .env
nano .env
```

Required values to fill in:

```bash
# Domains — adjust subdomain prefix as needed
APEX_DOMAIN=ruyin.ai
EDGE_DOMAIN=proxy.ruyin.ai      # VPN user portal
SUB_DOMAIN=sub.ruyin.ai         # subscription endpoint
CONSOLE_DOMAIN=console.ruyin.ai
# ... (see .env.example for all domains)

# Marzban admin credentials
MARZBAN_ADMIN_USER=admin
MARZBAN_ADMIN_PASSWORD=<generate: openssl rand -base64 32>
CONSOLE_HTPASSWD_PASSWORD=<same or different strong password>

# Vaultwarden admin token
VAULTWARDEN_ADMIN_TOKEN=<generate: openssl rand -base64 48>

# Let's Encrypt
CERTBOT_EMAIL=your@email.com

# Subscription URL prefix — no trailing slash
SUBSCRIPTION_URL_PREFIX=https://sub.ruyin.ai
```

Run the one-command deployment:

```bash
bash scripts/deploy-all.sh
```

| Step | Script | Action |
|------|--------|--------|
| 00 | `00-check-env.sh` | Validate env vars, Docker, ports |
| 01 | `01-init-dirs.sh` | Create data directory structure |
| 02 | `02-generate-reality.sh` | Generate REALITY x25519 keypair *(skip if exists)* |
| 03 | `03-issue-certs.sh` | Issue Let's Encrypt certs via certbot webroot *(skip if valid LE cert >30d)* |
| 04 | `04-render-configs.py` | Render all templates into `DATA_DIR` |
| 05 | `05-up.sh` | Pull images and start all containers |
| 06 | `06-verify.sh` | Verify all endpoints, containers, certs, databases |
| 07 | `07-backup.sh` | Create initial config backup |

After the deploy completes, run the post-deploy wizard to create VPN users and get subscription URLs:

```bash
bash scripts/deploy-post.sh
```

---

## Post-Deploy: Manual Steps

### 1. Configure Marzban Host

Connect to VPN first (console is IP-restricted to Docker network), then open `https://console.ruyin.ai`:

- Go to **Hosts** → add a host
- Address: `proxy.ruyin.ai` (or your `EDGE_DOMAIN`)
- Port: `443`
- SNI: `www.microsoft.com`
- Allow Insecure: off

### 2. Configure Uptime Kuma Monitors

Open `https://status.ruyin.ai` and add monitors for each domain.

### 3. Lock Down Vaultwarden

Open `https://vault.ruyin.ai`, create your account, then set `SIGNUPS_ALLOWED=false` (already set in docker-compose) — no action needed; signups are disabled by default.

---

## Operations

### Logs and status

```bash
docker compose ps
docker compose logs -f umbra-nginx
docker compose logs -f umbra-marzban
docker compose restart umbra-nginx
```

### Certificate management

```bash
bash scripts/deploy-certs.sh              # manual renewal check (also runs daily via cron)
bash scripts/deploy-certs.sh --status     # show expiry for all domains
bash scripts/deploy-certs.sh --upgrade    # force replace existing certs with new LE certs
```

Renewal runs daily at 03:17 via cron (added by `deploy-all.sh`).

### Reset and redeploy

```bash
# Soft reset: stop containers only, data preserved
bash scripts/server-reset.sh

# Full reset: destroy all data (prompts for YES)
bash scripts/server-reset.sh --full

# Redeploy after either reset
bash scripts/deploy-all.sh
```

> `--full` uses Docker internally to remove root-owned certbot files.

### Manual backup

```bash
bash scripts/steps/07-backup.sh
# Archives saved to BACKUP_DIR, 30-day retention
```

---

## Troubleshooting

### Red HTTPS in browser after first deploy

Certbot ran but nginx still serves old cert. Restart nginx:

```bash
docker compose restart umbra-nginx
```

### `rm -rf letsencrypt` — Permission denied

Certbot runs as root inside Docker; its files are root-owned. Clean them via Docker:

```bash
docker run --rm -v /srv/vxture/data/umbra/letsencrypt:/target alpine sh -c 'rm -rf /target/*'
```

### Marzban crash-loops on startup

Marzban (newer versions) requires a valid non-self-signed TLS cert to bind to `0.0.0.0`. Run real cert issuance first:

```bash
bash scripts/deploy-certs.sh --upgrade
docker compose restart umbra-marzban
```

### console.ruyin.ai returns 403

Expected — the admin console is IP-restricted to the Docker network (VPN clients only). Connect to VPN first, then access the console.

---

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `server-init.sh` | Bootstrap server: Docker, admin user, SSH hardening *(root, once)* |
| `server-reset.sh` | Stop or wipe deployment |
| `deploy-all.sh` | Full deployment orchestrator |
| `deploy-certs.sh` | Certificate lifecycle: renew / upgrade / status |
| `deploy-post.sh` | Post-deploy: create VPN users, show subscription URLs |
| `steps/06-verify.sh` | Verify all services and endpoints |
| `steps/07-backup.sh` | Backup databases and config files |

---

## Architecture

```
Internet
   │
   ├─ :80  → nginx HTTP → ACME challenge / 301 redirect to HTTPS
   │
   └─ :443 → nginx stream (SNI preread)
                ├─ SNI = www.microsoft.com → Xray VLESS+REALITY (port 10443 internal)
                └─ SNI = anything else     → nginx HTTP block (:8443)
                                               ├─ ruyin.ai          → landing page
                                               ├─ proxy.ruyin.ai    → VPN portal
                                               ├─ sub.ruyin.ai      → Marzban /sub/*
                                               ├─ console.ruyin.ai  → Marzban dashboard (IP restricted)
                                               ├─ vault.ruyin.ai    → Vaultwarden
                                               ├─ status.ruyin.ai   → Uptime Kuma
                                               ├─ docs.ruyin.ai     → Static docs
                                               └─ go.ruyin.ai       → Shlink
```

See [`docs/agent.md`](docs/agent.md) for full design reference.
