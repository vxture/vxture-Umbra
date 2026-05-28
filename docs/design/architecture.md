# Umbra - Architecture

---

## Traffic Flow

### Public Entry

```
Internet
|-- :80  -> umbra-nginx HTTP
|          |-- /.well-known/acme-challenge/ -> DATA_DIR/certbot/www
|          `-- everything else -> HTTPS redirect or default response
`-- :443 -> umbra-nginx stream listener with SNI preread
           |-- SNI = REALITY_SNI -> umbra-marzban:10443 (Xray subprocess)
           `-- other SNI values -> umbra-nginx internal HTTPS listener :8443
                                      |-- ruyin.ai         -> static landing
                                      |-- www.ruyin.ai     -> static landing copy
                                      |-- EDGE_DOMAIN      -> umbra-account:8081
                                      |-- sub.ruyin.ai           -> umbra-subproxy:8080 -> umbra-marzban:8000 /sub/<token>
                                      |-- console.ruyin.ai -> umbra-marzban:8000 and /invites/ -> umbra-account:8081
                                      |-- pass.ruyin.ai    -> umbra-vaultwarden:80
                                      `-- vault.ruyin.ai   -> placeholder
```

### REALITY Proxy Path

```
Client
`-- VLESS+REALITY -> EDGE_DOMAIN:443 (SNI: REALITY_SNI)
                    `-- umbra-nginx stream
                        `-- umbra-marzban:10443 (Xray subprocess)
                            `-- outbound freedom/direct
```

### Subscription Path

```
Clash client
`-- HTTPS GET sub.ruyin.ai/sub/<token>
    `-- umbra-nginx HTTP vhost
        `-- umbra-subproxy:8080
            `-- umbra-marzban:8000
                `-- Marzban renders DATA_DIR/marzban/templates/clash/default.yml
```

---

## SNI Routing Detail

Nginx operates in two modes simultaneously:

```
Mode 1: stream (layer 4, public port 443)
  - Reads SNI via ssl_preread without terminating TLS
  - Routes REALITY_SNI to umbra-marzban:10443
  - Routes all other SNI values to the internal HTTPS listener on :8443

Mode 2: http (layer 7, internal port 8443)
  - Terminates TLS for normal domains
  - Routes by server_name to static files or container upstreams
```

Why two-level? Because:
- REALITY requires passing raw TLS to Xray without Nginx terminating it.
- Normal HTTPS domains need Nginx to terminate TLS and proxy HTTP.
- One public 443 listener can branch both paths by SNI.

---

## Container Topology

```
Docker network: umbra-net

Host ports:
  80  -> umbra-nginx
  443 -> umbra-nginx stream

Services:
  umbra-nginx
    - public HTTP/HTTPS/SNI gateway
    - internal HTTPS virtual hosts on :8443
    - proxies REALITY traffic to umbra-marzban:10443
    - proxies Marzban web/API traffic to umbra-marzban:8000
    - proxies subscription traffic to umbra-subproxy:8080

  umbra-marzban
    - Marzban API/admin/subscription on :8000
    - bundled Xray subprocess on :10443

  umbra-subproxy
    - internal-only metadata normalizer for /sub/<token>

  umbra-account
    - invite-bound user account portal on :8081
    - stores account and invite state in DATA_DIR/account/account.db
    - talks to Marzban API and native subscription info endpoints

  umbra-portal
    - legacy static guide on :80, exposed under EDGE_DOMAIN /guide/

  umbra-vaultwarden
    - Vaultwarden on :80
```

---
## Server Directory Structure

```
/srv/vxture/
|-- repo/
|   `-- umbra/                         # Git repo
|       |-- docker-compose.yml
|       |-- .env.example
|       |-- configs/
|       |   |-- nginx/
|       |   |   |-- nginx.conf
|       |   |   |-- stream.conf.template
|       |   |   |-- snippets/
|       |   |   |   |-- proxy-headers.conf
|       |   |   |   |-- security-headers.conf
|       |   |   |   `-- ssl-params.conf
|       |   |   `-- vhosts/
|       |   |       |-- 00-default.conf.template
|       |   |       |-- 01-ruyin.conf.template
|       |   |       |-- 02-www.conf.template
|       |   |       |-- 03-vpn-portal.conf.template
|       |   |       |-- 04-sub.conf.template
|       |   |       |-- 05-console.conf.template
|       |   |       |-- 06-pass.conf.template
|       |   |       `-- 07-vault.conf.template
|       |   |-- xray/
|       |   |   `-- config.json.template
|       |   `-- marzban/
|       |       `-- clash-subscription.j2
|       |-- portals/
|       |   |-- website/
|       |   |   `-- static/
|       |   |-- console/
|       |   |   |-- app/
|       |   |   `-- static/
|       |   |       `-- guide/
|       |   `-- admin/
|       |-- scripts/
|       |   |-- server.sh
|       |   |-- deploy.sh
|       |   |-- ops.sh
|       |   |-- lib/
|       |   |   |-- env.sh
|       |   |   `-- log.sh
|       |   |-- server/
|       |   |   |-- init.sh
|       |   |   `-- reset.sh
|       |   |-- deploy/
|       |   |   |-- 00-check-env.sh
|       |   |   |-- 01-init-dirs.sh
|       |   |   |-- 02-generate-reality.sh
|       |   |   |-- 03-issue-certs.sh
|       |   |   |-- 03-self-signed.sh
|       |   |   |-- 04-render-configs.py
|       |   |   |-- 05-up.sh
|       |   |   |-- 06-verify.sh
|       |   |   |-- all.sh
|       |   |   `-- post.sh
|       |   `-- ops/
|       |       |-- backup.sh
|       |       `-- certs.sh
|       `-- docs/
|-- data/
|   `-- umbra/                         # Runtime data, not in Git
|       |-- nginx/
|       |   |-- nginx.conf
|       |   |-- conf.d/
|       |   |-- stream.d/
|       |   |-- snippets/
|       |   |-- html/
|       |   |   |-- ruyin-landing/
|       |   |   `-- www-ruyin/
|       |   |-- private/
|       |   `-- logs/
|       |-- marzban/
|       |   |-- db.sqlite3
|       |   |-- xray_config.json
|       |   |-- templates/
|       |   `-- tls/
|       |-- portal/
|       |   `-- html/
|       |-- account/
|       |   `-- account.db
|       |-- vaultwarden/
|       |   `-- data/
|       |-- letsencrypt/
|       |-- certbot/
|       `-- private/
|           `-- reality.json
`-- backup/
    `-- umbra/
```
---

## Port Allocation

| Port | Visibility | Container | Purpose |
|------|-----------|-----------|---------|
| 80 | Public | umbra-nginx | HTTP, ACME challenge, redirect |
| 443 | Public | umbra-nginx | SNI stream entry (all HTTPS traffic) |
| 8443 | Internal | umbra-nginx | HTTP virtual hosts (after SNI handoff) |
| 10443 | Internal | umbra-marzban | Bundled Xray subprocess: VLESS + REALITY |
| 8000 | Internal | umbra-marzban | Marzban API + admin + subscription |
| 8080 | Internal | umbra-subproxy | Subscription metadata normalization |
| 8081 | Internal | umbra-account | Invite-bound account portal |
| 80 | Internal | umbra-vaultwarden | Vaultwarden HTTP |
| 80 | Internal | umbra-portal | Legacy static guide |

---

## Git Repository Structure

The authoritative file list is the repository itself. The high-level layout is:

```
umbra/
|-- README.md
|-- .env.example
|-- docker-compose.yml
|-- configs/
|-- docs/
|-- portals/
|   |-- website/
|   |-- console/
|   `-- admin/
|-- services/
`-- scripts/
```
