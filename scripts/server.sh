#!/usr/bin/env bash
# Server lifecycle dispatcher.
#
# Usage:
#   bash scripts/server.sh <command> [args]
#
# Commands:
#   init              Bootstrap a fresh server; run as root
#   reset [--full]    Stop or wipe this node; run as admin user
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CMD="${1:-}"
shift || true

_usage() {
  echo ""
  echo "  Usage: bash scripts/server.sh <command> [args]"
  echo ""
  echo "  Server lifecycle:"
  echo "    init              Bootstrap server packages, admin user, SSH keys"
  echo "    reset [--full]    Stop containers or wipe runtime data"
  echo ""
}

case "$CMD" in
  init)
    exec bash "$SCRIPT_DIR/server/init.sh" "$@"
    ;;
  reset)
    exec bash "$SCRIPT_DIR/server/reset.sh" "$@"
    ;;
  "")
    _usage
    exit 1
    ;;
  *)
    echo "[ERROR] Unknown server command: $CMD" >&2
    _usage
    exit 1
    ;;
esac
