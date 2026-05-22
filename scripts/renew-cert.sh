#!/usr/bin/env bash
# Certificate renewal — run daily via cron
# Certbot only renews when expiry < 30 days; otherwise exits cleanly.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"
source "$SCRIPT_DIR/lib/log.sh"

log_banner "Umbra — Certificate Renewal"

CERT_DIR="$DATA_DIR/letsencrypt"
WEBROOT="$DATA_DIR/certbot/www"

log_step "Running certbot renew..."
docker run --rm \
  -v "$CERT_DIR:/etc/letsencrypt" \
  -v "$DATA_DIR/certbot/config:/var/lib/letsencrypt" \
  -v "$WEBROOT:/var/www/certbot" \
  certbot/certbot renew \
    --webroot \
    --webroot-path /var/www/certbot \
    --non-interactive \
    --quiet \
    --post-hook "echo 'Renewal complete'"

log_step "Reloading Nginx..."
if docker exec umbra-nginx nginx -s reload 2>/dev/null; then
  log_ok "Nginx reloaded"
else
  log_warn "Nginx reload failed — container may not be running"
fi

log_ok "Certificate renewal check complete."
