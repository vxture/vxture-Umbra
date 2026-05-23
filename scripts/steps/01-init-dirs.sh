#!/usr/bin/env bash
# Create DATA_DIR and BACKUP_DIR directory structure with correct permissions
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/env.sh"
source "$SCRIPT_DIR/../lib/log.sh"

log_banner "Umbra — Init Directories"

mk() {
  mkdir -p "$1"
  log_ok "mkdir -p $1"
}

# ── Data directories ──────────────────────────────────────────────────────────
log_step "Creating DATA_DIR structure at $DATA_DIR ..."

mk "$DATA_DIR/nginx/conf.d"
mk "$DATA_DIR/nginx/stream.d"
mk "$DATA_DIR/nginx/html/ruyin-landing"
mk "$DATA_DIR/nginx/html/www-ruyin"
mk "$DATA_DIR/nginx/private"
mk "$DATA_DIR/nginx/logs"
mk "$DATA_DIR/marzban/templates/clash"
mk "$DATA_DIR/marzban/templates/v2ray"
mk "$DATA_DIR/marzban/logs"

# Internal TLS cert so Marzban binds to 0.0.0.0 (newer Marzban ignores UVICORN_HOST without SSL)
MARZBAN_CERT="$DATA_DIR/marzban/internal-cert.pem"
MARZBAN_KEY="$DATA_DIR/marzban/internal-key.pem"
if [[ ! -f "$MARZBAN_CERT" ]]; then
  openssl req -x509 -newkey rsa:2048 \
    -keyout "$MARZBAN_KEY" -out "$MARZBAN_CERT" \
    -days 3650 -nodes -subj "/CN=umbra-marzban" 2>/dev/null
  chmod 600 "$MARZBAN_KEY"
  log_ok "Generated Marzban internal TLS cert"
else
  log_info "Marzban internal cert already exists — skipping"
fi

mk "$DATA_DIR/vaultwarden/data"
mk "$DATA_DIR/uptime-kuma/data"
mk "$DATA_DIR/portal/html"
mk "$DATA_DIR/docs/site"
mk "$DATA_DIR/shortlink/data"
mk "$DATA_DIR/letsencrypt"
mk "$DATA_DIR/certbot/www/.well-known/acme-challenge"
mk "$DATA_DIR/private"

# ── Backup directory ──────────────────────────────────────────────────────────
log_step "Creating BACKUP_DIR at $BACKUP_DIR ..."
mk "$BACKUP_DIR"

# ── Permissions: sensitive directories ───────────────────────────────────────
log_step "Setting permissions on sensitive directories..."

chmod 700 "$DATA_DIR/private"
log_ok "chmod 700 $DATA_DIR/private"

chmod 700 "$DATA_DIR/nginx/private"
log_ok "chmod 700 $DATA_DIR/nginx/private"

chmod 700 "$BACKUP_DIR"
log_ok "chmod 700 $BACKUP_DIR"

# ── Copy nginx.conf (static, no templating needed) ────────────────────────────
REPO_NGINX_CONF="$REPO_DIR/configs/nginx/nginx.conf"
DATA_NGINX_CONF="$DATA_DIR/nginx/nginx.conf"

if [[ -f "$REPO_NGINX_CONF" ]] && [[ ! -f "$DATA_NGINX_CONF" ]]; then
  cp "$REPO_NGINX_CONF" "$DATA_NGINX_CONF"
  log_ok "Copied nginx.conf to $DATA_NGINX_CONF"
elif [[ -f "$DATA_NGINX_CONF" ]]; then
  log_info "nginx.conf already exists — skipping copy"
fi

# ── Copy snippet configs ──────────────────────────────────────────────────────
SNIPPETS_SRC="$REPO_DIR/configs/nginx/snippets"
SNIPPETS_DST="$DATA_DIR/nginx/snippets"
mk "$SNIPPETS_DST"

for f in "$SNIPPETS_SRC"/*.conf; do
  fname="$(basename "$f")"
  if [[ ! -f "$SNIPPETS_DST/$fname" ]]; then
    cp "$f" "$SNIPPETS_DST/$fname"
    log_ok "Copied snippet: $fname"
  fi
done

log_ok "Directory init complete."
