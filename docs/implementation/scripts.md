# Script Implementation

The deployment flow is intentionally script-first.

## Entrypoints

| Script | Purpose |
|---|---|
| `scripts/server-init.sh` | Prepare a fresh server: packages, user, directories, firewall |
| `scripts/deploy-all.sh` | Full deployment pipeline |
| `scripts/deploy.sh` | Dispatcher for common operations such as verify, config, logs, restart |
| `scripts/deploy-certs.sh` | Issue, renew, upgrade, restore, and sync TLS certificates |
| `scripts/deploy-post.sh` | Post-deploy Marzban host config, user creation, subscription URL export |
| `scripts/server-reset.sh` | Server reset helper; treat as destructive |

## Ordered Steps

| Step | Purpose |
|---|---|
| `00-check-env.sh` | Validate env, Docker, DNS, ports |
| `01-init-dirs.sh` | Create `DATA_DIR` and `BACKUP_DIR`, copy nginx static config/snippets |
| `02-generate-reality.sh` | Generate or reuse REALITY keys |
| `03-issue-certs.sh` | Issue Let's Encrypt certs |
| `03-self-signed.sh` | Generate self-signed recovery certs |
| `04-render-configs.py` | Render all templates |
| `05-up.sh` | Validate Marzban TLS and start containers |
| `06-verify.sh` | Verify runtime behavior |
| `07-backup.sh` | Create backup archives |

Do not move step files back to the `scripts/` root. The `steps/` directory is part of the current project layout.
