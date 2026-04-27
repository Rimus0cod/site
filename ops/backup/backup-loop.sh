#!/bin/sh
set -eu

BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"

while true
do
  /backup-scripts/backup-postgres.sh
  sleep "$BACKUP_INTERVAL_SECONDS"
done
