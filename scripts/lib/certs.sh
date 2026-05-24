#!/usr/bin/env bash
# Certificate helpers shared by deployment and operations scripts.

umbra_sync_marzban_tls() {
  local cert_dir="$1"
  local domain="$2"
  local tls_dir="$3"

  if [[ ! -d "$cert_dir" ]]; then
    log_error "Certificate directory does not exist: $cert_dir"
    return 1
  fi

  mkdir -p "$tls_dir"

  if docker run --rm \
    -v "$cert_dir:/certs:ro" \
    -v "$tls_dir:/tls" \
    -e EDGE_DOMAIN="$domain" \
    alpine sh -c '
      set -eu
      cert="/certs/live/$EDGE_DOMAIN/fullchain.pem"
      key="/certs/live/$EDGE_DOMAIN/privkey.pem"

      if [ ! -f "$cert" ] || [ ! -f "$key" ]; then
        echo "Missing certificate or private key for $EDGE_DOMAIN" >&2
        echo "Expected: $cert" >&2
        echo "Expected: $key" >&2
        exit 1
      fi

      cp "$cert" /tls/cert.pem
      cp "$key" /tls/key.pem
      chmod 644 /tls/cert.pem
      chmod 600 /tls/key.pem
    '; then
    log_ok "Marzban TLS synced from $domain certificate"
  else
    log_error "Cannot sync Marzban TLS from $cert_dir/live/$domain"
    return 1
  fi
}
