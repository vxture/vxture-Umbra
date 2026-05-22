#!/usr/bin/env bash
# Start all Docker services
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"
source "$SCRIPT_DIR/lib/log.sh"

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

# Quick health check: fail if any service exited
EXITED=$(docker compose ps --status exited --format json 2>/dev/null \
  | python3 -c "import sys,json; data=json.load(sys.stdin); [print(s['Name']) for s in data]" 2>/dev/null || echo "")

if [[ -n "$EXITED" ]]; then
  log_error "The following containers exited unexpectedly:"
  echo "$EXITED"
  log_info "Check logs with: docker compose logs <container-name>"
  exit 1
fi

log_ok "All services started."
