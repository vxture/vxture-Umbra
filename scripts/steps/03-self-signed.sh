#!/usr/bin/env bash
# Generate self-signed certificates for all domains.
# Use this when DNS is not yet pointed to this server and real certs
# cannot be issued. Allows the rest of the deployment to proceed.
# Replace with real certs: bash scripts/deploy-certs.sh --upgrade
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/env.sh"
source "$SCRIPT_DIR/../lib/log.sh"

log_banner "Umbra — Self-Signed Certificates (debug mode)"
log_warn "These certs are NOT trusted by browsers."
log_warn "Run deploy-certs.sh --upgrade once DNS is pointed to this server."
echo ""

CERT_DIR="$DATA_DIR/letsencrypt"

DOMAINS=(
  "$APEX_DOMAIN"
  "$WWW_DOMAIN"
  "$EDGE_DOMAIN"
  "$SUB_DOMAIN"
  "$CONSOLE_DOMAIN"
  "$PASS_DOMAIN"
  "$VAULT_DOMAIN"
  "$STATUS_DOMAIN"
  "$DOCS_DOMAIN"
  "$SHORTLINK_DOMAIN"
)

for domain in "${DOMAINS[@]}"; do
  cert_path="$CERT_DIR/live/$domain/fullchain.pem"

  if [[ -f "$cert_path" ]]; then
    log_info "$domain — cert already exists, skipping"
    continue
  fi

  mkdir -p "$CERT_DIR/live/$domain"

  openssl req -x509 -newkey rsa:2048 \
    -keyout "$CERT_DIR/live/$domain/privkey.pem" \
    -out    "$CERT_DIR/live/$domain/fullchain.pem" \
    -days 90 -nodes \
    -subj "/CN=$domain" 2>/dev/null

  chmod 600 "$CERT_DIR/live/$domain/privkey.pem"
  log_ok "Self-signed cert created: $domain"
done

echo ""
log_ok "All self-signed certificates ready."
log_info "To upgrade to real certs once DNS is ready:"
log_info "  bash scripts/deploy-certs.sh --upgrade"
