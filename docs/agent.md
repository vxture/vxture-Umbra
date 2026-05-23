# Umbra — Agent Entry Point

> Master entry point for AI assistants (Claude Code, Codex, DeepSeek).
> Read this first. Follow document links for detail.

---

## Project Identity

```
Name:       Vxture Umbra
Repo:       vxture/umbra
Node:       vxture-edge-01
User:       stone
Version:    v1.0-production
Purpose:    Production overseas edge entry node
```

**One-liner:**
> Umbra is a production-grade overseas edge node providing multi-user VPN access, subscription delivery, SNI-based domain routing, password management, status monitoring, and docs hosting — all behind a unified 443 entry.

**Principles:**
- No compromises on architecture — build it right from the start
- Replaceable node: rebuild rather than rescue
- Backend business machines are never the first public entry point
- Secrets never enter Git

---

## Service Inventory

| Service | Container | Domain | Purpose |
|---------|-----------|--------|---------|
| Nginx | `umbra-nginx` | gateway | SNI stream + HTTP virtual hosts |
| Xray-core | `umbra-xray` | — | VLESS + REALITY + Vision proxy |
| Marzban | `umbra-marzban` | sub.ruyin.ai, console.ruyin.ai | VPN user management + subscription |
| VPN Portal | `umbra-portal` | vpn.ruyin.ai | User onboarding, client downloads, docs |
| Vaultwarden | `umbra-vaultwarden` | pass.ruyin.ai | Password manager |
| Docs | `umbra-docs` | docs.ruyin.ai | Static documentation site |
| Certbot | `umbra-certbot` | — | Let's Encrypt cert automation |

---

## Domain Map

| Domain | Target | Notes |
|--------|--------|-------|
| `ruyin.ai` | Nginx → static landing | Brand home, navigation to services |
| `www.ruyin.ai` | Nginx → static content | Independent content from apex |
| `vpn.ruyin.ai` | Nginx → umbra-portal | VPN user entry, onboarding, client DL |
| `sub.ruyin.ai` | Nginx → umbra-marzban | Marzban subscription endpoint |
| `console.ruyin.ai` | Nginx → umbra-marzban (VPN-only + Basic Auth) | Marzban admin panel |
| `pass.ruyin.ai` | Nginx → umbra-vaultwarden | Password manager |
| `vault.ruyin.ai` | Nginx → static placeholder | Reserved for future use |
| `docs.ruyin.ai` | Nginx → umbra-docs | Static documentation |

---

## Current Milestone

**Building: v1.0 Production Edge Node**

Deploy order (dependencies drive sequence):

```
Phase 1 — Infrastructure
  [ ] Nginx (base config, HTTP only)
  [ ] Certbot (issue all certs)
  [ ] Nginx (HTTPS + SNI stream)

Phase 2 — Core Services
  [ ] Xray-core (VLESS + REALITY)
  [ ] Marzban
  [ ] VPN Portal (static site)

Phase 3 — Supporting Services
  [ ] Vaultwarden
  [ ] Docs site

Phase 4 — Hardening
  [ ] vpn-admin IP restriction
  [ ] Backup automation
  [ ] Logrotate
  [ ] Cert renewal cron
  [ ] External uptime monitoring configured (BetterStack / UptimeRobot)
```

---

## Document Map

| Document | Content |
|----------|---------|
| [`agent.md`](agent.md) | **This file.** Identity, service inventory, domain map, constraints |
| [`architecture.md`](architecture.md) | Traffic flow, SNI routing, container topology, directory layout |
| [`modules.md`](modules.md) | Per-service spec: config, volumes, ports, environment variables |
| [`design.md`](design.md) | Design decisions: security model, B++ rules, subscription design |
| [`deployment.md`](deployment.md) | Deploy steps, .env reference, verification checklist, migration |
| [`operations.md`](operations.md) | Backup, rollback, cert renewal, user management, monitoring |

---

## Global Build Constraints

1. **Edge Mode only** — no Simple Mode. Xray runs on internal port, never public.
2. **All traffic enters on 443** — Nginx SNI stream routes to correct internal service.
3. **SQLite** — all services (Marzban, Vaultwarden) use SQLite for data storage. No PostgreSQL.
4. **Secrets never in Git** — `.env`, keys, certs, DB passwords all stay in `DATA_DIR/private/`.
5. **console.ruyin.ai has three access layers** — see Security Model in `design.md`.
6. **All containers in one Docker network** — `umbra-net`, internal service discovery by container name.
7. **Subscription B++ rules built into Marzban template** — no external URL dependencies.
8. **Microsoft / Cloudflare must NOT be forced to PROXY** in B++ rules.
9. **Node name in subscriptions: `vx-tokyo`** (from `NODE_NAME` env var).
10. **Backup runs automatically** after every successful deployment and on daily cron.
11. **`DATA_DIR/private/` permissions: `700` dir, `600` files.**
12. **Scripts must be idempotent** — safe to re-run without destroying existing state.

---

## v1.0 Success Criteria

```
[ ] All containers running: nginx, marzban, vaultwarden, portal, docs
[ ] HTTPS working on all 7 domains
[ ] Xray REALITY connection functional (test with Clash Verge)
[ ] Marzban admin accessible at console.ruyin.ai only when VPN-connected
[ ] Marzban subscription URL functional at sub.ruyin.ai
[ ] Subscription imports correctly into Clash Verge
[ ] Node name shows vx-tokyo
[ ] B++ rules present and correct (openai.com PROXY, microsoft.com not forced)
[ ] Vaultwarden login functional at pass.ruyin.ai
[ ] Placeholder responding at vault.ruyin.ai
[ ] Docs site loading at docs.ruyin.ai
[ ] VPN Portal loading at vpn.ruyin.ai
[ ] Backup archive created with correct permissions (600)
[ ] Cert renewal cron configured
[ ] Sensitive files not present in Git
```
