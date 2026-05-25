#!/usr/bin/env bash
# Certificate helpers shared by deployment and operations scripts.

umbra_validate_cert_domain() {
  local domain="${1:-}"

  if [[ -z "$domain" ]]; then
    log_error "Certificate domain is empty."
    return 1
  fi

  if [[ ! "$domain" =~ ^[A-Za-z0-9.-]+$ ]] \
     || [[ "$domain" == .* ]] \
     || [[ "$domain" == *. ]] \
     || [[ "$domain" == *..* ]]; then
    log_error "Invalid certificate domain: $domain"
    return 1
  fi
}

umbra_list_empty_renewal_configs() {
  local cert_dir="$1"

  if [[ ! -d "$cert_dir" ]]; then
    return 0
  fi

  docker run --rm \
    -v "$cert_dir:/certs:ro" \
    alpine sh -c '
      set -eu
      if [ -d /certs/renewal ]; then
        find /certs/renewal -type f -name "*.conf" -size 0 -print
      fi
    ' 2>/dev/null || true
}

umbra_clean_empty_renewal_configs() {
  local cert_dir="$1"
  local removed

  if [[ ! -d "$cert_dir" ]]; then
    return 0
  fi

  removed="$(docker run --rm \
    -v "$cert_dir:/certs" \
    alpine sh -c '
      set -eu
      if [ -d /certs/renewal ]; then
        find /certs/renewal -type f -name "*.conf" -size 0 -print -delete
      fi
    ' 2>/dev/null || true)"

  if [[ -n "$removed" ]]; then
    while IFS= read -r path; do
      [[ -n "$path" ]] && log_warn "Removed empty renewal config: ${path#/certs/}"
    done <<< "$removed"
  fi
}

umbra_clean_empty_domain_renewal_config() {
  local cert_dir="$1"
  local domain="$2"
  local removed

  umbra_validate_cert_domain "$domain" || return 1

  if [[ ! -d "$cert_dir" ]]; then
    return 0
  fi

  removed="$(docker run --rm \
    -v "$cert_dir:/certs" \
    -e DOMAIN="$domain" \
    alpine sh -c '
      set -eu
      f="/certs/renewal/$DOMAIN.conf"
      if [ -f "$f" ] && [ ! -s "$f" ]; then
        rm -f "$f"
        echo "$f"
      fi
    ' 2>/dev/null || true)"

  if [[ -n "$removed" ]]; then
    log_warn "Removed empty renewal config after failed issuance: ${removed#/certs/}"
  fi
}

umbra_sync_marzban_tls() {
  local cert_dir="$1"
  local domain="$2"
  local tls_dir="$3"

  umbra_validate_cert_domain "$domain" || return 1

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
