#!/usr/bin/env bash
# Start all Docker services
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/env.sh"
source "$SCRIPT_DIR/../lib/log.sh"

log_banner "Umbra — Start Services"

cd "$REPO_DIR"

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
