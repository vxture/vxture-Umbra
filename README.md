# Vxture Umbra

Production overseas edge entry node — proxy access, subscription delivery, SNI routing, password management, status monitoring.

**Stack:** Nginx · Xray REALITY · Marzban · PostgreSQL · Vaultwarden · Uptime Kuma · Shlink

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/vxture/umbra.git /srv/vxture/repo/umbra
cd /srv/vxture/repo/umbra

# 2. Configure
cp .env.example .env
# Edit .env — fill in passwords, domains, email

# 3. Deploy
bash scripts/deploy-all.sh
```

## Services

| Domain | Service |
|--------|---------|
| `vpn.ruyin.ai` | VPN Portal |
| `sub.ruyin.ai` | Marzban Subscriptions |
| `console.ruyin.ai` | Marzban Admin *(VPN-only)* |
| `vault.ruyin.ai` | Vaultwarden |
| `status.ruyin.ai` | Uptime Kuma |
| `docs.ruyin.ai` | Documentation |
| `go.ruyin.ai` | Short Links |

## Scripts

| Script | Purpose |
|--------|---------|
| `deploy-all.sh` | Full deployment (idempotent) |
| `scripts/06-verify.sh` | Verify all services |
| `scripts/07-backup.sh` | Manual backup |
| `scripts/renew-cert.sh` | Certificate renewal |

## Docs

See [`docs/agent.md`](docs/agent.md) for full architecture and design reference.
