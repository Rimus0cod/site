# Backup and Restore Guide

## Scheduled backup service

Production compose starts a dedicated `backup` container that runs:

- `ops/backup/backup-loop.sh`
- `ops/backup/backup-postgres.sh`

The backup job:

- creates PostgreSQL custom-format dumps with `pg_dump -Fc`
- writes dumps into `ops/backups/`
- writes freshness metadata into `ops/backup-state/last-success.json`
- prunes old dumps according to `BACKUP_RETENTION_DAYS`

## Important environment variables

```env
BACKUP_RETENTION_DAYS=7
BACKUP_INTERVAL_SECONDS=86400
BACKUP_STATUS_FILE=/var/lib/barberbook/backup-state/last-success.json
BACKUP_MAX_AGE_HOURS=24
```

## Manual backup

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backup sh /backup-scripts/backup-postgres.sh
```

## Manual restore

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backup sh /backup-scripts/restore-postgres.sh /backups/<backup-file>.dump
```

## Restore drill

At least monthly:

1. Create a fresh staging database.
2. Restore the latest dump into staging.
3. Run app migrations if required for the target version.
4. Verify admin login, slot lookup, booking creation, and payment reconciliation paths.
5. Record restore duration and note any manual steps.
