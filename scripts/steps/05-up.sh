#!/usr/bin/env bash
# Start all Docker services
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/env.sh"
source "$SCRIPT_DIR/../lib/log.sh"

log_banner "Umbra — Start Services"

cd "$REPO_DIR"

# ── Marzban TLS cert ──────────────────────────────────────────────────────────
# Marzban (newer versions) binds to 127.0.0.1 when no SSL cert is provided,
# making it unreachable from other Docker containers (nginx gets 502).
# It also rejects self-signed certs. Copy the LE cert issued in step 03 so
# Marzban binds to 0.0.0.0. nginx proxies https:// with proxy_ssl_verify off.
MARZBAN_TLS_DIR="$DATA_DIR/marzban/tls"
mkdir -p "$MARZBAN_TLS_DIR"

LE_CERT="$DATA_DIR/letsencrypt/live/$EDGE_DOMAIN/fullchain.pem"
LE_KEY="$DATA_DIR/letsencrypt/live/$EDGE_DOMAIN/privkey.pem"

if [[ -f "$LE_CERT" ]]; then
  cp "$LE_CERT" "$MARZBAN_TLS_DIR/cert.pem"
  cp "$LE_KEY"  "$MARZBAN_TLS_DIR/key.pem"
  chmod 600 "$MARZBAN_TLS_DIR/key.pem"
  log_ok "Marzban TLS: copied LE cert for $EDGE_DOMAIN"
else
  log_error "LE cert not found: $LE_CERT"
  log_error "Marzban requires /var/lib/marzban/tls/cert.pem and will restart without it."
  log_info  "Run certificate issuance first: bash scripts/steps/03-issue-certs.sh"
  log_info  "Or upgrade/repair certs:      bash scripts/deploy-certs.sh --upgrade"
  exit 1
fi

log_step "Pulling latest images..."
docker compose pull --quiet

log_step "Starting services..."
docker compose up -d

log_step "Waiting for services to initialize (15s)..."
sleep 15

log_step "Container status:"
docker compose ps

# Health check: fail if any service exited or is crash-looping
PROBLEMS=""

for container in umbra-nginx umbra-marzban umbra-vaultwarden umbra-portal; do
  state=$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || echo "missing")

  if [[ "$state" == "exited" ]]; then
    PROBLEMS="$PROBLEMS\n  $container: exited unexpectedly"
  elif [[ "$state" == "restarting" ]]; then
    PROBLEMS="$PROBLEMS\n  $container: crash-looping (currently restarting)"
  fi
done

if [[ -n "$PROBLEMS" ]]; then
  log_error "Container health check failed:"
  echo -e "$PROBLEMS"
  log_info "Diagnose with: docker compose logs <container-name>"
  exit 1
fi

log_ok "All services started."
