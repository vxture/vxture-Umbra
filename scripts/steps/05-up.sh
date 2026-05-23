#!/usr/bin/env bash
# Start all Docker services
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/env.sh"
source "$SCRIPT_DIR/../lib/log.sh"

log_banner "Umbra — Start Services"

cd "$REPO_DIR"

# ── Marzban internal TLS cert ─────────────────────────────────────────────────
# Marzban (newer versions) binds to 127.0.0.1 when no SSL cert is provided,
# making it unreachable from other Docker containers. A self-signed cert forces
# it to bind to 0.0.0.0. nginx proxies with proxy_ssl_verify off.
MARZBAN_TLS_DIR="$DATA_DIR/marzban/tls"
if [[ ! -f "$MARZBAN_TLS_DIR/cert.pem" ]]; then
  log_step "Generating Marzban internal TLS cert..."
  mkdir -p "$MARZBAN_TLS_DIR"
  openssl req -x509 -newkey rsa:2048 \
    -keyout "$MARZBAN_TLS_DIR/key.pem" \
    -out    "$MARZBAN_TLS_DIR/cert.pem" \
    -days 3650 -nodes \
    -subj "/CN=umbra-marzban" \
    2>/dev/null
  chmod 600 "$MARZBAN_TLS_DIR/key.pem"
  log_ok "Marzban internal TLS cert generated"
else
  log_ok "Marzban internal TLS cert already exists — skipping"
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
