# Production Deployment Guide

## What changed

- Production compose now uses built artifacts instead of dev servers.
- Backend migrations are executed as a separate operational step.
- Frontend is built into static assets and served by nginx.
- Critical secrets are validated and blocked if placeholder values are used in production.
- Health endpoints are split into `/health/live` and `/health/ready`.
- Redis-backed throttling is enabled for public and admin login flows.
- Background jobs now run in a dedicated `worker` service.
- Telegram polling is isolated to the worker while the API stays in outbound-only mode.
- Prometheus-compatible metrics are available at `/api/v1/metrics`.
- Daily PostgreSQL backups now run in a dedicated `backup` service and publish backup freshness state.
- Prometheus and Alertmanager can be enabled through the `observability` compose profile.

## Required environment variables

Create a deployment env file outside git, for example `.env.production`, and pass it to Compose with `--env-file`.

Required variables:

```env
DB_NAME=barbershop
DB_USER=barber
DB_PASSWORD=<strong database password>
JWT_SECRET=<32+ character random secret>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong admin password>
FRONTEND_URL=https://example.com
BACKEND_PUBLIC_URL=https://example.com
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=<provider secret>
STRIPE_WEBHOOK_SECRET=<provider webhook secret>
STRIPE_PUBLISHABLE_KEY=<provider publishable key>
TELEGRAM_MODE=outbound
WORKER_TELEGRAM_MODE=polling
BACKUP_STATUS_FILE=/var/lib/barberbook/backup-state/last-success.json
BACKUP_MAX_AGE_HOURS=24
BACKUP_RETENTION_DAYS=7
BACKUP_INTERVAL_SECONDS=86400
```

If you use LiqPay instead of Stripe, set:

```env
PAYMENT_PROVIDER=liqpay
LIQPAY_PUBLIC_KEY=<liqpay public key>
LIQPAY_PRIVATE_KEY=<liqpay private key>
```

## Deploy sequence

1. Build the images:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

2. Run database migrations as a one-off job before rolling out the app:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrations
```

3. Start or update the stack:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

4. Verify readiness:

```bash
curl -fsS https://your-domain/health/live
curl -fsS https://your-domain/health/ready
curl -fsS https://your-domain/api/v1/metrics
```

## TLS

- `docker-compose.prod.yml` now exposes both `80` and `443`.
- Put the real certificate pair into `nginx/certs/fullchain.pem` and `nginx/certs/privkey.pem` on the deployment host.
- HTTP traffic is redirected to HTTPS.

## Worker and Telegram

- The production stack now includes a dedicated `worker` container based on the backend image.
- API containers should use `TELEGRAM_MODE=outbound`.
- Worker containers should use `WORKER_TELEGRAM_MODE=polling` so only one process owns Telegram polling.
- If you scale workers horizontally, Redis locks prevent duplicate execution of reminder, hold expiration, and reconciliation cycles.

## Observability

- Prometheus scrapes the API at `backend:3001/api/v1/metrics`.
- Alert rules live in `monitoring/prometheus/alerts.yml`.
- Alertmanager config lives in `monitoring/alertmanager/alertmanager.yml`.
- Enable the stack with:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile observability up -d prometheus alertmanager
```

- The bundled Alertmanager receiver is intentionally empty. Replace it with your real Slack, webhook, email, or PagerDuty receiver before relying on notifications.

## Backup and Restore

- The production stack now includes a `backup` container that runs `pg_dump -Fc` on a schedule.
- Dumps are stored in `./ops/backups`.
- Freshness metadata is written to `./ops/backup-state/last-success.json`.
- API health and metrics use that metadata to report backup age.

Manual restore example:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm \
  -e DB_PASSWORD="$DB_PASSWORD" \
  backup sh /backup-scripts/restore-postgres.sh /backups/<backup-file>.dump
```

## Rollback

If rollout fails after the new images are built but before traffic is stable:

1. Stop the current deployment:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

2. Redeploy the previous known-good image set.

3. If the failure was caused by a migration, restore the latest PostgreSQL backup before serving traffic again.

## Backup baseline

Before every production migration you should still take an extra on-demand backup:

```bash
pg_dump --format=custom --file=backup.dump "$DATABASE_URL"
```

Restore drill baseline:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$TARGET_DATABASE_URL" backup.dump
```

Store backups outside the app host and verify restore at least monthly.
