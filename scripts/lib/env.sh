#!/usr/bin/env bash
# Load .env into environment if not already loaded

_ENV_LOADED="${_UMBRA_ENV_LOADED:-0}"
if [[ "$_ENV_LOADED" == "0" ]]; then
  _UMBRA_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PROJECT_ROOT="$(cd "$_UMBRA_LIB_DIR/../.." && pwd)"

  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$PROJECT_ROOT/.env"
    set +a
    export _UMBRA_ENV_LOADED=1
  else
    echo "[ERROR] .env not found at $PROJECT_ROOT/.env" >&2
    echo "        Copy .env.example to .env and fill in your values." >&2
    exit 1
  fi
fi
