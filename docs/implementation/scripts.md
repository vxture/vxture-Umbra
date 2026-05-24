# Script Implementation

Scripts are organized by lifecycle boundary.

## Entrypoints

| Entrypoint | Scope | Purpose |
|---|---|---|
| `scripts/server.sh` | Server | Bootstrap or reset the host machine |
| `scripts/deploy.sh` | Deploy | Build the service from repo/config into running containers |
| `scripts/ops.sh` | Ops | Operate an already deployed node |

## Internal Directories

| Directory | Purpose |
|---|---|
| `scripts/server/` | Server lifecycle implementation |
| `scripts/deploy/` | Deploy pipeline implementation |
| `scripts/ops/` | Runtime operations implementation |
| `scripts/lib/` | Shared shell helpers |

## Server Commands

| Command | Purpose |
|---|---|
| `bash scripts/server.sh init` | Install packages, Docker, admin user, SSH keys, firewall |
| `bash scripts/server.sh reset [--full]` | Stop containers or wipe runtime data after confirmation |

## Deploy Commands

| Command | Purpose |
|---|---|
| `bash scripts/deploy.sh all` | Run the full deploy pipeline and install cron jobs |
| `bash scripts/deploy.sh check` | Validate env, Docker, DNS, ports |
| `bash scripts/deploy.sh dirs` | Create runtime directories |
| `bash scripts/deploy.sh keys` | Generate or reuse REALITY keys |
| `bash scripts/deploy.sh certs` | Issue initial Let's Encrypt certificates |
| `bash scripts/deploy.sh config` | Render configs and reload nginx if running |
| `bash scripts/deploy.sh up` | Start containers |
| `bash scripts/deploy.sh verify` | Verify runtime behavior |
| `bash scripts/deploy.sh post` | Configure Marzban hosts, users, and subscription URLs |

## Ops Commands

| Command | Purpose |
|---|---|
| `bash scripts/ops.sh status` | Show container status |
| `bash scripts/ops.sh logs [service]` | Tail logs |
| `bash scripts/ops.sh restart [service]` | Restart services |
| `bash scripts/ops.sh reload` | Reload nginx |
| `bash scripts/ops.sh backup` | Create backup archives |
| `bash scripts/ops.sh certs --status` | Show certificate expiry |
| `bash scripts/ops.sh certs --renew` | Run certificate renewal check |
| `bash scripts/ops.sh certs --upgrade` | Replace self-signed recovery certs with trusted certs |

Compatibility wrappers remain in the `scripts/` root for old server habits. Do not use them in new docs.
