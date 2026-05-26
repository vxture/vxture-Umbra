#!/usr/bin/env bash
# Full deployment: runs all steps in order.
# Safe to re-run - each step is idempotent where possible.
#
# Options:
#   --skip-verify    Skip the verification step (useful on re-deploys)
#   --skip-backup    Skip the backup step
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/env.sh"
source "$SCRIPT_DIR/../lib/log.sh"
source "$SCRIPT_DIR/../lib/certs.sh"

SKIP_VERIFY=false
SKIP_BACKUP=false
for arg in "$@"; do
  case "$arg" in
    --skip-verify) SKIP_VERIFY=true ;;
    --skip-backup) SKIP_BACKUP=true ;;
  esac
done

if [[ "$EUID" -eq 0 ]]; then
  log_error "Do not run as root. Switch to the admin user: su - stone"
  log_error "Root-owned files in DATA_DIR will break subsequent runs by the admin user."
  exit 1
fi

log_banner "Umbra - Full Deployment"
log_info "Node:    $NODE_NAME"
mapfile -t CERT_DOMAINS < <(umbra_collect_cert_domains)
log_info "Domains: $EDGE_DOMAIN, $SUB_DOMAIN, +$(( ${#CERT_DOMAINS[@]} - 2 )) more (${#CERT_DOMAINS[@]} cert domains)"
log_info "Data:    $DATA_DIR"
log_info "Backup:  $BACKUP_DIR"
echo ""

run_step() {
  local step="$1"
  local label="$2"
  log_step "[$step] $label"
  bash "$SCRIPT_DIR/$step" || {
    log_error "Step $step failed. Deployment aborted."
    exit 1
  }
  echo ""
}

run_step_warn() {
  local step="$1"
  local label="$2"
  log_step "[$step] $label"
  bash "$SCRIPT_DIR/$step" || {
    log_warn "Step $step reported failures - services may still be running."
    log_warn "Check manually: bash scripts/deploy.sh verify"
  }
  echo ""
}

needs_staged_cert_upgrade() {
  local cert_dir="$DATA_DIR/letsencrypt"
  local domain cert_path live_path issuer
  local domains=()

  mapfile -t domains < <(umbra_collect_cert_domains)

  for domain in "${domains[@]}"; do
    live_path="$cert_dir/live/$domain"
    cert_path="$live_path/fullchain.pem"

    if [[ -e "$live_path" ]] && [[ ! -f "$cert_path" ]]; then
      log_info "Existing non-standard cert directory detected: $live_path"
      return 0
    fi

    if [[ -f "$cert_path" ]]; then
      issuer=$(openssl x509 -noout -issuer -in "$cert_path" 2>/dev/null || echo "")
      if ! echo "$issuer" | grep -qi "let's encrypt" || echo "$issuer" | grep -qi "staging\|fake"; then
        log_info "Existing non-trusted cert detected for $domain; staged upgrade required"
        return 0
      fi
    fi
  done

  return 1
}

run_staged_cert_upgrade() {
  log_step "[certs --upgrade] Safe staged certificate upgrade"
  bash "$SCRIPT_DIR/../ops/certs.sh" --upgrade || {
    log_error "Staged certificate upgrade failed. Deployment aborted."
    exit 1
  }
  echo ""
}

run_step "00-check-env.sh"        "Environment check"
run_step "01-init-dirs.sh"        "Initialize directories"
run_step "02-generate-reality.sh" "Generate REALITY keys"

# -- Certificate step: real or self-signed -------------------------------------
# Set CERTBOT_SKIP=true in .env to use self-signed certs (no DNS required).
# Upgrade later: bash scripts/ops.sh certs --upgrade
if [[ "${CERTBOT_SKIP:-false}" == "true" ]]; then
  run_step "03-self-signed.sh"    "Generate self-signed certificates (debug)"
elif needs_staged_cert_upgrade; then
  run_staged_cert_upgrade
else
  run_step "03-issue-certs.sh"    "Issue TLS certificates"
fi

log_step "[04] Render configuration templates"
python3 "$SCRIPT_DIR/04-render-configs.py" || {
  log_error "Config rendering failed. Deployment aborted."
  exit 1
}
echo ""

run_step "05-up.sh"              "Start Docker services"

if [[ "$SKIP_VERIFY" == "true" ]]; then
  log_info "Skipping verification (--skip-verify)"
else
  run_step_warn "06-verify.sh"   "Verify deployment"
fi

if [[ "$SKIP_BACKUP" == "true" ]]; then
  log_info "Skipping backup (--skip-backup)"
else
  bash "$SCRIPT_DIR/../ops/backup.sh" || {
    log_warn "Backup reported failures - services may still be running."
    log_warn "Check manually: bash scripts/ops.sh backup"
  }
  echo ""
fi

# -- Configure cert renewal and backup cron ------------------------------------
log_step "Configuring cron jobs..."

CRON_LINE="17 3 * * * $REPO_DIR/scripts/ops.sh certs --renew >> /var/log/umbra-cert-renew.log 2>&1"
BACKUP_CRON_LINE="0 2 * * * $REPO_DIR/scripts/ops.sh backup >> /var/log/umbra-backup.log 2>&1"

add_cron() {
  local line="$1"
  if ! crontab -l 2>/dev/null | grep -qF "$line"; then
    ( crontab -l 2>/dev/null; echo "$line" ) | crontab -
    log_ok "Cron added: $line"
  else
    log_info "Cron already exists: $(echo "$line" | cut -c1-60)..."
  fi
}

remove_legacy_cron() {
  local pattern="$1"
  if crontab -l 2>/dev/null | grep -qF "$pattern"; then
    crontab -l 2>/dev/null | grep -vF "$pattern" | crontab -
    log_ok "Removed legacy cron: $pattern"
  fi
}

remove_legacy_cron "$REPO_DIR/scripts/deploy-certs.sh"
remove_legacy_cron "$REPO_DIR/scripts/steps/07-backup.sh"
add_cron "$CRON_LINE"
add_cron "$BACKUP_CRON_LINE"

# -- Done ----------------------------------------------------------------------
echo ""
log_banner "Deployment Complete"
log_ok "All services are running."
echo ""
echo "  VPN Portal:    https://$EDGE_DOMAIN"
echo "  Subscriptions: https://$SUB_DOMAIN"
echo "  Console:       https://$CONSOLE_DOMAIN  (Marzban login)"
echo "  Password Mgr:  https://$PASS_DOMAIN"
echo "  Vault:         https://$VAULT_DOMAIN  (placeholder)"
echo ""
echo "  Next steps:"
echo "  1. Run post-deploy wizard: bash scripts/deploy.sh post"
echo "  2. Open https://$CONSOLE_DOMAIN and sign in with Marzban credentials"
echo "  3. (Optional) set up external uptime monitoring - BetterStack or UptimeRobot"
echo ""
