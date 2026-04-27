#!/bin/sh
set -eu

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:?DB_NAME is required}"
DB_USER="${DB_USER:?DB_USER is required}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_STATUS_FILE="${BACKUP_STATUS_FILE:-/backup-state/last-success.json}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

export PGPASSWORD="$DB_PASSWORD"

mkdir -p "$BACKUP_DIR" "$(dirname "$BACKUP_STATUS_FILE")"

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
target_file="$BACKUP_DIR/${DB_NAME}_${timestamp}.dump"
temp_file="${target_file}.tmp"

pg_dump \
  --format=custom \
  --file="$temp_file" \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  "$DB_NAME"

mv "$temp_file" "$target_file"

size_bytes="$(wc -c < "$target_file" | tr -d ' ')"
printf '{"timestamp":"%s","file":"%s","sizeBytes":%s}\n' \
  "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  "$target_file" \
  "$size_bytes" \
  > "$BACKUP_STATUS_FILE"

if [ "$BACKUP_RETENTION_DAYS" -gt 0 ] 2>/dev/null; then
  find "$BACKUP_DIR" -type f -name '*.dump' -mtime +"$BACKUP_RETENTION_DAYS" -delete
fi
