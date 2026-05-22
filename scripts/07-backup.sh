#!/usr/bin/env bash
# Create a timestamped backup of all runtime configs and database dumps
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"
source "$SCRIPT_DIR/lib/log.sh"

log_banner "Umbra — Backup"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="$BACKUP_DIR/umbra-config-${TIMESTAMP}.tar.gz"

# ── Database dumps ─────────────────────────────────────────────────────────────
log_step "Dumping PostgreSQL databases..."

for db in marzban vaultwarden shlink; do
  dump_file="$BACKUP_DIR/${db}-db-${TIMESTAMP}.sql.gz"
  if docker exec umbra-postgres pg_dump -U "$db" "$db" 2>/dev/null \
      | gzip > "$dump_file"; then
    chmod 600 "$dump_file"
    log_ok "Dumped $db → $(basename "$dump_file")"
  else
    log_warn "Could not dump $db (service may not be running)"
  fi
done

# ── Config archive ─────────────────────────────────────────────────────────────
log_step "Archiving configs and private data..."

# Items to include in the config archive (excluding DB data files for size)
BACKUP_ITEMS=(
  "$DATA_DIR/nginx/conf.d"
  "$DATA_DIR/nginx/stream.d"
  "$DATA_DIR/nginx/nginx.conf"
  "$DATA_DIR/nginx/private"
  "$DATA_DIR/marzban/templates"
  "$DATA_DIR/marzban/xray_config.json"
  "$DATA_DIR/letsencrypt"
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

# ── Crontab ────────────────────────────────────────────────────────────────────
log_step "Saving crontab..."
CRON_FILE="$BACKUP_DIR/root-crontab-${TIMESTAMP}.txt"
crontab -l 2>/dev/null > "$CRON_FILE" || echo "# no crontab" > "$CRON_FILE"
chmod 600 "$CRON_FILE"
log_ok "Crontab saved → $(basename "$CRON_FILE")"

# ── Retention: delete archives older than 30 days ─────────────────────────────
log_step "Cleaning up archives older than 30 days..."
DELETED=$(find "$BACKUP_DIR" -name "*.tar.gz" -o -name "*.sql.gz" -o -name "*.txt" \
  | xargs -I{} sh -c 'test $(( ($(date +%s) - $(stat -c %Y {} 2>/dev/null || stat -f %m {})) / 86400 )) -gt 30 && echo {}' 2>/dev/null || true)

if [[ -n "$DELETED" ]]; then
  echo "$DELETED" | while read -r f; do
    rm -f "$f" && log_info "Removed: $(basename "$f")"
  done
else
  log_info "No old archives to remove"
fi

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
log_ok "Backup complete. Files in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR" | tail -20
