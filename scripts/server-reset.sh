#!/usr/bin/env bash
# Reset this server's Umbra deployment.
#
# Default (soft): stops containers and frees ports — ready for a clean re-deploy.
#   Data and certs are preserved.
#
# --full: nuclear reset — destroys ALL data including databases, certs, and keys.
#   Requires typing YES to confirm. Use before reprovisioning from scratch.
#
# Usage:
#   bash scripts/server-reset.sh           # soft: stop containers only
#   bash scripts/server-reset.sh --full    # nuclear: destroy all data
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"
source "$SCRIPT_DIR/lib/log.sh"

MODE="${1:-}"

# ── Shared: stop containers + free ports ─────────────────────────────────────
stop_containers() {
  log_step "Stopping Umbra containers..."
  cd "$REPO_DIR"
  docker compose down --remove-orphans 2>/dev/null && log_ok "Containers stopped" || true

  # Remove any stale named containers from previous partial runs
  STALE=(certbot-nginx-tmp)
  for c in "${STALE[@]}"; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${c}$"; then
      docker rm -f "$c" &>/dev/null && log_ok "Removed stale container: $c"
    fi
  done
}

free_ports() {
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
}

# ── Full reset mode ───────────────────────────────────────────────────────────
if [[ "$MODE" == "--full" ]]; then
  log_banner "Umbra — Full Reset (Nuclear)"
  echo ""
  log_warn "This will permanently destroy:"
  log_warn "  DATA_DIR   : $DATA_DIR"
  log_warn "  BACKUP_DIR : $BACKUP_DIR"
  log_warn ""
  log_warn "All databases, certificates, REALITY keys, and configs will be lost."
  echo ""

  if [[ -t 0 ]]; then
    read -r -p "  Type YES to confirm full reset: " confirm
  else
    confirm=""
  fi

  if [[ "$confirm" != "YES" ]]; then
    log_info "Aborted — no changes made."
    exit 0
  fi

  stop_containers
  free_ports

  log_step "Removing all data..."
  if [[ -d "$DATA_DIR" ]]; then
    rm -rf "$DATA_DIR"
    log_ok "Removed: $DATA_DIR"
  else
    log_info "DATA_DIR already absent: $DATA_DIR"
  fi

  if [[ -d "$BACKUP_DIR" ]]; then
    rm -rf "$BACKUP_DIR"
    log_ok "Removed: $BACKUP_DIR"
  else
    log_info "BACKUP_DIR already absent: $BACKUP_DIR"
  fi

  echo ""
  log_ok "Full reset complete. Server is clean."
  log_info "To redeploy from scratch:"
  log_info "  bash scripts/deploy-all.sh"
  exit 0
fi

# ── Soft reset (default) ──────────────────────────────────────────────────────
log_banner "Umbra — Soft Reset"
log_info "Stops containers and frees ports. Data and certs are preserved."
echo ""

stop_containers
free_ports

echo ""
log_ok "Soft reset complete. Data is intact."
log_info "To redeploy:"
log_info "  bash scripts/deploy-all.sh"
