#!/usr/bin/env bash
# Post-deployment finalization.
# Run after deploy-all.sh completes successfully.
#
# Usage:
#   bash scripts/post-deploy.sh            # create users + print checklist
#   bash scripts/post-deploy.sh --certs    # upgrade to real TLS certs (after DNS cutover)
#   bash scripts/post-deploy.sh --reset    # stop containers, free ports (before re-deploy)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"
source "$SCRIPT_DIR/lib/log.sh"

MODE="${1:-}"

# ── Reset mode: clean up for re-deploy ───────────────────────────────────────
if [[ "$MODE" == "--reset" ]]; then
  log_banner "Umbra — Reset"

  log_step "Stopping and removing umbra containers..."
  cd "$REPO_DIR"
  docker compose down --remove-orphans 2>/dev/null && log_ok "Containers stopped" || true

  STALE=(certbot-nginx-tmp)
  for c in "${STALE[@]}"; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${c}$"; then
      docker rm -f "$c" &>/dev/null && log_ok "Removed: $c"
    fi
  done

  log_step "Freeing ports 80 and 443..."
  for port in 80 443; do
    pid=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | head -1 || echo "")
    if [[ -n "$pid" ]]; then
      proc=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
      kill -9 "$pid" && log_ok "Freed port $port (killed $proc pid=$pid)" || true
    else
      log_ok "Port $port is free"
    fi
  done

  echo ""
  log_ok "Reset complete. Ready to re-deploy:"
  log_info "  bash scripts/deploy-all.sh"
  exit 0
fi

# ── Cert upgrade mode ─────────────────────────────────────────────────────────
if [[ "$MODE" == "--certs" ]]; then
  log_banner "Umbra — Upgrade to Real TLS Certificates"

  log_step "Verifying DNS points to this server..."
  SERVER_IP=$(curl -sf --max-time 5 https://api.ipify.org 2>/dev/null || echo "")
  FAILED=0
  for domain in "$APEX_DOMAIN" "$WWW_DOMAIN" "$EDGE_DOMAIN" "$SUB_DOMAIN" \
                "$CONSOLE_DOMAIN" "$VAULT_DOMAIN" "$STATUS_DOMAIN" \
                "$DOCS_DOMAIN" "$SHORTLINK_DOMAIN"; do
    resolved=$(dig +short "$domain" 2>/dev/null | grep -E '^[0-9]+\.' | tail -1 || echo "")
    if [[ "$resolved" != "$SERVER_IP" ]]; then
      log_fail "$domain → $resolved (expected $SERVER_IP)"
      ((FAILED++)) || true
    else
      log_ok "$domain → $resolved"
    fi
  done

  if (( FAILED > 0 )); then
    log_error "$FAILED domain(s) not pointing to this server. Fix DNS first."
    exit 1
  fi

  log_step "Removing self-signed certificates..."
  rm -rf "$DATA_DIR/letsencrypt"
  log_ok "Removed self-signed certs"

  log_step "Issuing real Let's Encrypt certificates..."
  CERTBOT_STAGING=false bash "$SCRIPT_DIR/03-issue-certs.sh"

  log_step "Reloading Nginx..."
  docker exec "$NGINX_CONTAINER" nginx -s reload
  log_ok "Nginx reloaded with real certificates"

  echo ""
  log_ok "TLS upgrade complete. All domains now use trusted certificates."
  exit 0
fi

# ── Main post-deploy ──────────────────────────────────────────────────────────
log_banner "Umbra — Post-Deploy"

# ── Create Marzban users ──────────────────────────────────────────────────────
log_step "Creating Marzban users..."

USER_COUNT="${USER_COUNT:-10}"
USER_PREFIX="${USER_PREFIX:-user}"

# Get Marzban admin token via internal API
MARZBAN_TOKEN=$(docker exec umbra-marzban python3 - <<PYEOF
import urllib.request, urllib.parse, json, sys

data = urllib.parse.urlencode({
    'username': '${MARZBAN_ADMIN_USER}',
    'password': '${MARZBAN_ADMIN_PASSWORD}'
}).encode()

try:
    req = urllib.request.Request('http://localhost:8000/api/admin/token', data=data)
    with urllib.request.urlopen(req, timeout=10) as r:
        print(json.loads(r.read())['access_token'])
except Exception as e:
    print('ERROR: ' + str(e), file=sys.stderr)
    sys.exit(1)
PYEOF
)

if [[ -z "$MARZBAN_TOKEN" ]]; then
  log_error "Could not authenticate with Marzban API"
  log_info  "Is umbra-marzban running? Check: docker compose ps"
  exit 1
fi

log_ok "Marzban API authenticated"

CREATED=0
SKIPPED=0
declare -A SUB_URLS

for i in $(seq -w 1 "$USER_COUNT"); do
  username="${USER_PREFIX}${i}"

  # Check if user already exists
  exists=$(docker exec umbra-marzban python3 - <<PYEOF
import urllib.request, json, sys

req = urllib.request.Request(
    'http://localhost:8000/api/user/${username}',
    headers={'Authorization': 'Bearer ${MARZBAN_TOKEN}'}
)
try:
    with urllib.request.urlopen(req, timeout=5) as r:
        data = json.loads(r.read())
        print(data.get('subscription_url', ''))
except urllib.error.HTTPError as e:
    if e.code == 404:
        print('NOT_FOUND')
    else:
        print('ERROR', file=sys.stderr)
        sys.exit(1)
PYEOF
)

  if [[ "$exists" != "NOT_FOUND" ]]; then
    log_info "User $username already exists — skipping"
    SUB_URLS[$username]="${SUBSCRIPTION_URL_PREFIX}${exists}"
    ((SKIPPED++)) || true
    continue
  fi

  # Create user
  sub_url=$(docker exec umbra-marzban python3 - <<PYEOF
import urllib.request, json, sys

payload = json.dumps({
    "username": "${username}",
    "proxies": {"vless": {}},
    "data_limit": 0,
    "expire": None,
    "data_limit_reset_strategy": "no_reset",
    "status": "active"
}).encode()

req = urllib.request.Request(
    'http://localhost:8000/api/user',
    data=payload,
    headers={
        'Authorization': 'Bearer ${MARZBAN_TOKEN}',
        'Content-Type': 'application/json'
    }
)
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
        print(data.get('subscription_url', ''))
except Exception as e:
    print('ERROR: ' + str(e), file=sys.stderr)
    sys.exit(1)
PYEOF
)

  SUB_URLS[$username]="${SUBSCRIPTION_URL_PREFIX}${sub_url}"
  log_ok "Created: $username"
  ((CREATED++)) || true
done

echo ""
log_info "Users: created=$CREATED  skipped=$SKIPPED"

# ── Print subscription URLs ───────────────────────────────────────────────────
echo ""
log_step "Subscription URLs"
echo "  ┌─────────────────────────────────────────────────────────────────────"
for i in $(seq -w 1 "$USER_COUNT"); do
  username="${USER_PREFIX}${i}"
  echo "  │  $username"
  echo "  │    ${SUB_URLS[$username]}"
  echo "  │"
done
echo "  └─────────────────────────────────────────────────────────────────────"

# Save to file for easy access
SUB_FILE="$BACKUP_DIR/subscription-urls-$(date +%Y%m%d).txt"
{
  echo "# Subscription URLs — generated $(date)"
  echo "# Server: $NODE_NAME ($EDGE_DOMAIN)"
  echo ""
  for i in $(seq -w 1 "$USER_COUNT"); do
    username="${USER_PREFIX}${i}"
    echo "$username  ${SUB_URLS[$username]}"
  done
} > "$SUB_FILE"
chmod 600 "$SUB_FILE"
log_ok "Saved to: $SUB_FILE"

# ── DNS cutover checklist ─────────────────────────────────────────────────────
SERVER_IP=$(curl -sf --max-time 5 https://api.ipify.org 2>/dev/null || echo "unknown")

echo ""
log_step "DNS Cutover Checklist"
echo ""
echo "  Server IP: $SERVER_IP"
echo ""
echo "  Update the following A records to $SERVER_IP:"
echo ""

DOMAINS=(
  "$APEX_DOMAIN" "$WWW_DOMAIN" "$EDGE_DOMAIN" "$SUB_DOMAIN"
  "$CONSOLE_DOMAIN" "$VAULT_DOMAIN" "$STATUS_DOMAIN" "$DOCS_DOMAIN" "$SHORTLINK_DOMAIN"
)

for domain in "${DOMAINS[@]}"; do
  resolved=$(dig +short "$domain" 2>/dev/null | grep -E '^[0-9]+\.' | tail -1 || echo "?")
  if [[ "$resolved" == "$SERVER_IP" ]]; then
    echo "  ✓  $domain  →  $resolved"
  else
    echo "  ✗  $domain  →  $resolved  (needs update)"
  fi
done

echo ""
echo "  After all domains point to $SERVER_IP, upgrade to real TLS certs:"
echo "  $ bash scripts/post-deploy.sh --certs"

# ── Uptime Kuma reminder ──────────────────────────────────────────────────────
echo ""
log_step "Manual tasks remaining"
echo ""
echo "  1. Uptime Kuma monitors — configure via UI after DNS cutover:"
echo "     https://$STATUS_DOMAIN"
echo ""
echo "     Suggested monitors:"
echo "       • HTTP  https://$EDGE_DOMAIN"
echo "       • HTTP  https://$SUB_DOMAIN"
echo "       • HTTP  https://$VAULT_DOMAIN"
echo "       • HTTP  https://$STATUS_DOMAIN"
echo "       • TCP   $EDGE_DOMAIN:443  (VPN port)"
echo "       • PostgreSQL  umbra-postgres:5432"
echo ""
echo "  2. Vaultwarden admin setup:"
echo "     https://$VAULT_DOMAIN/admin  (use VAULTWARDEN_ADMIN_TOKEN from .env)"
echo ""
echo "  3. Distribute subscription URLs to users (saved in $SUB_FILE)"

echo ""
log_ok "Post-deploy complete."
