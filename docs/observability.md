# Observability Guide

## Metrics

The API exposes Prometheus metrics at:

```text
/api/v1/metrics
```

Included signals:

- HTTP request count by method, route, and status code
- HTTP latency histogram
- component readiness gauges for PostgreSQL, Redis, and backup freshness
- worker task last success timestamp
- worker task last duration
- worker task last error timestamp

## Prometheus

Prometheus config lives in:

- `monitoring/prometheus/prometheus.yml`
- `monitoring/prometheus/alerts.yml`

Enable it with:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile observability up -d prometheus alertmanager
```

## Alerts

Bundled alert rules cover:

- API 5xx rate above 1% over 5 minutes
- p95 API latency above 500ms over 10 minutes
- PostgreSQL readiness failure
- Redis readiness failure
- backup freshness older than 24 hours
- reminder worker lag
- payment reconciliation worker lag

## Alertmanager

The default `monitoring/alertmanager/alertmanager.yml` uses a placeholder receiver with no integrations.

Before production rollout, replace it with your real notification channel, for example:

- Slack webhook
- email
- PagerDuty
- generic webhook
