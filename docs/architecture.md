# Umbra — Architecture

---

## Traffic Flow

### Public Entry

```
Internet
    │
    ├── :80  → umbra-nginx (HTTP)
    │           ├── ACME challenge path  → serve /var/www/certbot
    │           └── all other requests  → 301 redirect to https://
    │
    └── :443 → umbra-nginx (stream, SNI preread)
                    │
                    ├── SNI = www.microsoft.com (REALITY camouflage)
                    │       └── xray_backend → umbra-xray:10443
                    │
                    └── SNI = *.ruyin.ai / ruyin.ai
                            └── http_backend → umbra-nginx HTTP listener :8443 (internal)
                                    │
                                    ├── ruyin.ai             → static landing
                                    ├── www.ruyin.ai         → static content
                                    ├── vpn.ruyin.ai         → umbra-portal:80
                                    ├── sub.ruyin.ai         → umbra-marzban:8000
                                    ├── console.ruyin.ai     → umbra-marzban:8000 (VPN-only + Basic Auth)
                                    ├── pass.ruyin.ai       → umbra-vaultwarden:80
                                    ├── vault.ruyin.ai      → static placeholder
                                    └── docs.ruyin.ai       → umbra-docs:80
```

### REALITY Proxy Path

```
Clash/V2Ray client
    │
    └── VLESS+REALITY → vpn.ruyin.ai:443 (SNI: www.microsoft.com)
                            │
                        umbra-nginx stream
                            │ (ssl_preread SNI match)
                            │
                        umbra-xray:10443
                            │
                        outbound → freedom (direct)
```

### Subscription Path

```
Clash client subscription update
    │
    └── HTTPS GET → sub.ruyin.ai/sub/<token>
                        │
                    umbra-nginx HTTP
                        │ (proxy_pass)
                        │
                    umbra-marzban:8000
                        │ (subscription generator)
                        │
                    PostgreSQL (user + config data)
```

---

## SNI Routing Detail

Nginx operates in two modes simultaneously:

```
Mode 1: stream (layer 4, port 443)
  - Reads SNI via ssl_preread (no TLS termination)
  - Routes to either xray_backend or http_backend

Mode 2: http (layer 7, internal port 8443)
  - TLS termination here
  - server_name-based virtual host routing
  - Each domain → dedicated upstream
```

Why two-level? Because:
- REALITY requires passing raw TLS to Xray (no termination at Nginx)
- All other domains need Nginx to terminate TLS and proxy HTTP
- One stream listener can branch both paths from a single public port

---

## Container Topology

```
Docker network: umbra-net (bridge)

┌──────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌─────────────────────┐                                          │
│  │    umbra-nginx       │  :80 ← host (HTTP + ACME)               │
│  │    (Nginx)           │  :443 ← host (SNI stream)               │
│  │                      │  :8443 (internal HTTP server)           │
│  └──────────┬───────────┘                                         │
│             │ proxies to (all internal)                            │
│             │                                                      │
│  ┌──────────▼──┐  ┌────────────┐  ┌──────────────┐               │
│  │ umbra-xray   │  │umbra-marzban│  │umbra-portal  │               │
│  │ :10443       │  │ :8000       │  │ :80          │               │
│  └─────────────┘  └──────┬──────┘  └──────────────┘               │
│                          │                                          │
│                   ┌──────▼──────┐                                  │
│                   │ (SQLite, no  │                                  │
│                   │  DB container│                                  │
│                   └─────────────┘                                  │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │umbra-vaultwarden│  │ umbra-docs  │                               │
│  │ :80 (int)    │  │ :80          │                                │
│  └──────────────┘  └──────────────┘                                │
│                                                                    │
│  ┌──────────────┐  ┌────────────────────────────────┐             │
│  │umbra-portal  │  │umbra-certbot (one-shot + cron) │             │
│  │ :80           │  │ (no persistent port)           │             │
│  └──────────────┘  └────────────────────────────────┘             │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Server Directory Structure

```
/srv/vxture/
│
├── repo/
│   └── umbra/                        ← Git repo (this project)
│       ├── docker-compose.yml
│       ├── .env.example
│       ├── configs/
│       │   ├── nginx/
│       │   │   ├── stream.conf.template
│       │   │   ├── http.conf.template
│       │   │   ├── vhosts/
│       │   │   │   ├── ruyin-landing.conf.template
│       │   │   │   ├── www-ruyin.conf.template
│       │   │   │   ├── vpn-portal.conf.template
│       │   │   │   ├── sub-marzban.conf.template
│       │   │   │   ├── console.conf.template
│       │   │   │   ├── 06-pass.conf.template
│       │   │   │   ├── 08-docs.conf.template
│       │   │   │   └── 10-vault.conf.template
│       │   │   └── snippets/
│       │   │       ├── ssl-params.conf
│       │   │       ├── proxy-headers.conf
│       │   │       └── security-headers.conf
│       │   ├── xray/
│       │   │   └── config.json.template
│       │   └── marzban/
│       │       └── clash-subscription.j2  ← B++ rules template
│       ├── scripts/
│       │   ├── lib/
│       │   │   ├── env.sh
│       │   │   ├── log.sh
│       │   │   └── utils.py
│       │   ├── 00-check-env.sh
│       │   ├── 01-init-dirs.sh
│       │   ├── 02-generate-reality.sh
│       │   ├── 03-issue-certs.sh
│       │   ├── 04-render-configs.py
│       │   ├── 05-up.sh
│       │   ├── 06-verify.sh
│       │   ├── 07-backup.sh
│       │   ├── renew-cert.sh
│       │   └── deploy-all.sh
│       └── docs/
│
├── data/
│   └── umbra/                        ← Runtime data (NOT in Git)
│       ├── nginx/
│       │   ├── conf.d/               ← Rendered vhost configs
│       │   ├── stream.d/             ← Rendered stream config
│       │   ├── html/
│       │   │   ├── ruyin-landing/    ← ruyin.ai static files
│       │   │   └── www-ruyin/        ← www.ruyin.ai static files
│       │   └── logs/
│       ├── marzban/
│       │   ├── xray_config.json      ← Marzban manages this
│       │   ├── db.sqlite3            ← Marzban database
│       │   └── templates/
│       ├── vaultwarden/
│       │   └── data/                 ← Vaultwarden DB + attachments
│       ├── portal/
│       │   └── html/
│       ├── docs/
│       │   └── site/                 ← Built static docs
│       ├── letsencrypt/              ← Certs for all domains
│       ├── certbot/                  ← ACME account + challenges
│       └── private/                  ← Secrets (700/600)
│           └── reality.json
│
└── backup/
    └── umbra/                        ← Archives (700/600)
```

---

## Port Allocation

| Port | Visibility | Container | Purpose |
|------|-----------|-----------|---------|
| 80 | Public | umbra-nginx | HTTP, ACME challenge, redirect |
| 443 | Public | umbra-nginx | SNI stream entry (all HTTPS traffic) |
| 8443 | Internal | umbra-nginx | HTTP virtual hosts (after SNI handoff) |
| 10443 | Internal | umbra-xray | VLESS + REALITY |
| 8000 | Internal | umbra-marzban | Marzban API + admin + subscription |
| 80 | Internal | umbra-vaultwarden | Vaultwarden HTTP |
| 80 | Internal | umbra-portal | VPN portal static site |
| 80 | Internal | umbra-docs | Docs static site |

---

## Git Repository Structure

```
umbra/
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
├── configs/
│   ├── nginx/
│   │   ├── stream.conf.template
│   │   ├── http.conf.template
│   │   ├── vhosts/               (9 virtual host templates)
│   │   └── snippets/             (ssl, proxy-headers, security-headers)
│   ├── xray/
│   │   └── config.json.template
│   └── marzban/
│       └── clash-subscription.j2
├── scripts/
│   ├── lib/
│   ├── 00-check-env.sh
│   ├── 01-init-dirs.sh
│   ├── 02-generate-reality.sh
│   ├── 03-issue-certs.sh
│   ├── 04-render-configs.py
│   ├── 05-up.sh
│   ├── 06-verify.sh
│   ├── 07-backup.sh
│   ├── renew-cert.sh
│   └── deploy-all.sh
├── docs/
│   ├── agent.md
│   ├── architecture.md
│   ├── modules.md
│   ├── design.md
│   ├── deployment.md
│   └── operations.md
└── tests/
    └── fixtures/
```
