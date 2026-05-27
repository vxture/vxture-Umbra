#!/usr/bin/env bash
# Create timestamped backup archives for runtime state.
#
# The normal archives are useful for operational rollback. The minimal state
# archive is the migration-critical set: .env secrets, LE certificates, Marzban
# DB, REALITY keys, and saved subscription URLs.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/env.sh"
source "$SCRIPT_DIR/../lib/log.sh"

log_banner "Umbra - Backup"

if [[ -z "${ROOT_DIR:-}" ]]; then
  log_error "ROOT_DIR is required for minimal recovery backup."
  log_info "Set ROOT_DIR in .env, for example: ROOT_DIR=/srv/vxture"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

ARCHIVE="$BACKUP_DIR/umbra-config-${TIMESTAMP}.tar.gz"
MINIMAL_ARCHIVE="$BACKUP_DIR/minimal-state-${TIMESTAMP}.tar.gz"

create_minimal_state_archive() {
  local archive_name
  local host_uid
  local host_gid
  archive_name="$(basename "$MINIMAL_ARCHIVE")"
  host_uid="$(id -u)"
  host_gid="$(id -g)"

  log_step "Creating minimal recovery state archive..."
  if ! docker run --rm \
    -v "$ROOT_DIR:/source:ro" \
    -v "$BACKUP_DIR:/backup" \
    -e ARCHIVE_NAME="$archive_name" \
    -e HOST_UID="$host_uid" \
    -e HOST_GID="$host_gid" \
    alpine sh -c '
      set -eu
      cd /source
      manifest="$(mktemp)"
      missing=0

      require_path() {
        if [ -e "$1" ]; then
          printf "%s\n" "$1" >> "$manifest"
        else
          echo "missing required backup item: $1" >&2
          missing=1
        fi
      }

      require_path repo/umbra/.env
      require_path data/umbra/letsencrypt
      require_path data/umbra/marzban/db.sqlite3
      require_path data/umbra/private/reality.json

      if [ -d backup/umbra ]; then
        sub_count="$(find backup/umbra -maxdepth 1 -type f -name "subscription-urls-*.txt" | sort | tee -a "$manifest" | wc -l | tr -d " ")"
        if [ "$sub_count" -eq 0 ]; then
          echo "warning: no subscription URL records found under backup/umbra" >&2
        fi
      else
        echo "warning: backup/umbra does not exist; subscription URL records not included" >&2
      fi

      if [ "$missing" -ne 0 ]; then
        exit 1
      fi

      tar -czf "/backup/$ARCHIVE_NAME" -T "$manifest"
      chown "$HOST_UID:$HOST_GID" "/backup/$ARCHIVE_NAME"
      chmod 600 "/backup/$ARCHIVE_NAME"
    '; then
    log_error "Minimal recovery state archive failed."
    log_info "It must include .env, certificates, Marzban DB, REALITY keys, and subscription URL records."
    return 1
  fi

  sha256sum "$MINIMAL_ARCHIVE" > "$MINIMAL_ARCHIVE.sha256"
  chmod 600 "$MINIMAL_ARCHIVE.sha256"

  local size
  size=$(du -sh "$MINIMAL_ARCHIVE" | cut -f1)
  log_ok "Minimal recovery state: $(basename "$MINIMAL_ARCHIVE") ($size)"
  log_ok "Checksum: $(basename "$MINIMAL_ARCHIVE.sha256")"
}

# -- SQLite database copies ----------------------------------------------------
log_step "Backing up SQLite databases..."

declare -A SQLITE_DBS=(
  ["marzban"]="$DATA_DIR/marzban/db.sqlite3"
)

for label in marzban; do
  db_path="${SQLITE_DBS[$label]}"
  dest="$BACKUP_DIR/${label}-db-${TIMESTAMP}.sqlite3"
  if [[ -f "$db_path" ]]; then
    cp "$db_path" "$dest"
    chmod 600 "$dest"
    log_ok "Backed up $label -> $(basename "$dest")"
  else
    log_warn "$label database not found at $db_path - skipping"
  fi
done

# -- Vaultwarden full data backup -----------------------------------------------
# Must archive the whole directory: SQLite holds metadata, but attachments and
# Send files are stored as blobs in data/attachments/ and data/sends/.
# A DB-only backup leaves all file attachments unrecoverable.
log_step "Backing up Vaultwarden data (DB + attachments + sends)..."
VW_DATA="$DATA_DIR/vaultwarden/data"
if [[ -d "$VW_DATA" ]]; then
  VW_ARCHIVE="$BACKUP_DIR/vaultwarden-data-${TIMESTAMP}.tar.gz"
  tar -czf "$VW_ARCHIVE" -C "$(dirname "$VW_DATA")" "$(basename "$VW_DATA")" 2>/dev/null
  chmod 600 "$VW_ARCHIVE"
  SIZE=$(du -sh "$VW_ARCHIVE" | cut -f1)
  log_ok "Vaultwarden data -> $(basename "$VW_ARCHIVE") ($SIZE)"
else
  log_warn "Vaultwarden data dir not found at $VW_DATA - skipping"
fi

# -- Config archive -------------------------------------------------------------
log_step "Archiving configs and private data..."

# Items to include in the config archive (excluding DB data files for size)
BACKUP_ITEMS=(
  "$DATA_DIR/nginx/conf.d"
  "$DATA_DIR/nginx/stream.d"
  "$DATA_DIR/nginx/nginx.conf"
  "$DATA_DIR/nginx/private"
  "$DATA_DIR/marzban/templates"
  "$DATA_DIR/marzban/xray_config.json"
  "$DATA_DIR/private"
)

EXISTING_ITEMS=()
for item in "${BACKUP_ITEMS[@]}"; do
  [[ -e "$item" ]] && EXISTING_ITEMS+=("$item")
done

if [[ ${#EXISTING_ITEMS[@]} -gt 0 ]]; then
  tar -czf "$ARCHIVE" "${EXISTING_ITEMS[@]}" 2>/dev/null
  chmod 600 "$ARCHIVE"
  SIZE=$(du -sh "$ARCHIVE" | cut -f1)
  log_ok "Config archive: $(basename "$ARCHIVE") ($SIZE)"
else
  log_warn "No config items found to archive"
fi

# -- Crontab --------------------------------------------------------------------
log_step "Saving crontab..."
CRON_FILE="$BACKUP_DIR/root-crontab-${TIMESTAMP}.txt"
crontab -l 2>/dev/null > "$CRON_FILE" || echo "# no crontab" > "$CRON_FILE"
chmod 600 "$CRON_FILE"
log_ok "Crontab saved -> $(basename "$CRON_FILE")"

# -- Minimal recovery state ----------------------------------------------------
create_minimal_state_archive

# -- Retention: delete archives older than 30 days -----------------------------
log_step "Cleaning up archives older than 30 days..."
DELETED=0
while IFS= read -r -d '' f; do
  if rm -f -- "$f"; then
    log_info "Removed: $(basename "$f")"
    DELETED=1
  fi
done < <(
  find "$BACKUP_DIR" -type f \( -name "*.tar.gz" -o -name "*.sqlite3" -o -name "*.txt" -o -name "*.sha256" \) -mtime +30 -print0 2>/dev/null
)

if [[ "$DELETED" == "0" ]]; then
  log_info "No old archives to remove"
fi

# -- Summary --------------------------------------------------------------------
echo ""
log_ok "Backup complete. Files in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR" | tail -20
