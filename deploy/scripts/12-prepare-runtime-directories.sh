#!/usr/bin/env bash
# Create DATA_DIR and BACKUP_DIR directory structure with correct permissions
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/01-env.sh"
source "$SCRIPT_DIR/../lib/00-log.sh"

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
  echo ""
  echo "  Usage: bash deploy/deploy.sh directories"
  echo ""
  echo "  Creates DATA_DIR and BACKUP_DIR directory structure"
  echo "  with correct permissions. Copies nginx.conf and snippets."
  echo ""
  echo "  Called automatically by: bash deploy/deploy.sh all"
  echo "  Run standalone:          bash deploy/deploy.sh directories"
  echo ""
  exit 0
fi

log_banner "Umbra - Init Directories"

mk() {
  mkdir -p "$1"
  log_ok "mkdir -p $1"
}

# -- Runtime directories (rendered nginx config; regenerable, not backed up) ---
log_step "Creating RUNTIME_DIR structure at $RUNTIME_DIR ..."

mk "$RUNTIME_DIR/nginx/conf.d"
mk "$RUNTIME_DIR/nginx/stream.d"
mk "$RUNTIME_DIR/nginx/private"
mk "$RUNTIME_DIR/nginx/logs"
mk "$RUNTIME_DIR/hysteria"

# -- Data directories (persistent state; the only tree that is backed up) ------
log_step "Creating DATA_DIR structure at $DATA_DIR ..."

mk "$DATA_DIR/marzban/templates/clash"
mk "$DATA_DIR/marzban/templates/v2ray"
mk "$DATA_DIR/marzban/logs"
mk "$DATA_DIR/account"
mk "$DATA_DIR/vaultwarden/data"
mk "$DATA_DIR/letsencrypt"
mk "$DATA_DIR/certbot/www/.well-known/acme-challenge"
mk "$DATA_DIR/certbot/config"
mk "$DATA_DIR/certbot/hooks"
mk "$DATA_DIR/private"

# -- Backup directory ----------------------------------------------------------
log_step "Creating BACKUP_DIR at $BACKUP_DIR ..."
mk "$BACKUP_DIR"

# -- Operator config dir (persistent home for .env; survives deploy re-pulls) --
# The deploy/ dir is disposable (CI rsyncs it fresh), so the hand-maintained
# .env lives here instead. The operator places .env; this only ensures the dir.
mk "$ROOT_DIR/etc"

# -- Permissions: sensitive directories ---------------------------------------
log_step "Setting permissions on sensitive directories..."

chmod 700 "$ROOT_DIR/etc"
log_ok "chmod 700 $ROOT_DIR/etc"

chmod 700 "$DATA_DIR/private"
log_ok "chmod 700 $DATA_DIR/private"

chmod 700 "$DATA_DIR/account"
log_ok "chmod 700 $DATA_DIR/account"

chmod 711 "$RUNTIME_DIR/nginx/private"
log_ok "chmod 711 $RUNTIME_DIR/nginx/private"

chmod 700 "$BACKUP_DIR"
log_ok "chmod 700 $BACKUP_DIR"

# -- Copy nginx.conf (plain file, no templating needed) ------------------------
# Always overwrite so repo changes (e.g. map blocks) propagate to the running config.
REPO_NGINX_CONF="$REPO_DIR/configs/nginx/nginx.conf"
RUNTIME_NGINX_CONF="$RUNTIME_DIR/nginx/nginx.conf"

if [[ -f "$REPO_NGINX_CONF" ]]; then
  cp "$REPO_NGINX_CONF" "$RUNTIME_NGINX_CONF"
  log_ok "Copied nginx.conf to $RUNTIME_NGINX_CONF"
fi

# -- Copy snippet configs ------------------------------------------------------
SNIPPETS_SRC="$REPO_DIR/configs/nginx/snippets"
SNIPPETS_DST="$RUNTIME_DIR/nginx/snippets"
mk "$SNIPPETS_DST"

for f in "$SNIPPETS_SRC"/*.conf; do
  fname="$(basename "$f")"
  cp "$f" "$SNIPPETS_DST/$fname"
  log_ok "Copied snippet: $fname"
done

log_ok "Directory init complete."
