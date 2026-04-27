# BarberBook Studio

BarberBook Studio - full-stack платформа для барбершопа: публичная запись, личный кабинет клиента, админ-панель, платежи, Telegram-уведомления, мониторинг и production-окружение на Docker Compose.

## Что умеет проект

- Публичная запись клиента: выбор услуги, барбера, даты и времени.
- Механизм `booking hold`: слот сначала резервируется, затем подтверждается через оплату.
- Кабинет клиента: регистрация/вход по телефону и PIN, просмотр и управление записями.
- Подтверждение, перенос и отмена записи по токену доступа.
- Админ-панель: барберы, услуги, графики, бронирования.
- Платежные провайдеры: `mock`, `stripe`, `liqpay`.
- Фоновый `worker` для Telegram polling, напоминаний, reconciliation и служебных задач.
- Production-стек с `nginx`, `postgres`, `redis`, Prometheus, Alertmanager и автоматическими бэкапами.

## Архитектура

```text
Frontend (React/Vite)
        |
        v
      Nginx
        |
   +----+-------------------+
   |                        |
   v                        v
Frontend static         Backend API (NestJS)
                              |
                    +---------+---------+
                    |                   |
                    v                   v
                 PostgreSQL           Redis
                              |
                              v
                           Worker
```

## Стек

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod

### Backend

- NestJS 10
- TypeScript
- TypeORM
- PostgreSQL 15
- Redis 7
- JWT auth
- Cookie + CSRF защита
- Telegram Bot API
- Prometheus metrics

### Infra

- Docker
- Docker Compose
- Nginx
- Prometheus
- Alertmanager

## Структура репозитория

```text
backend/      NestJS API, миграции, сущности, worker
frontend/     React-приложение клиента и админки
nginx/        production reverse proxy и TLS-конфиг
monitoring/   Prometheus и Alertmanager
ops/          скрипты бэкапов и состояние backup freshness
docs/         дополнительные production-документы
```

## Основные маршруты

### Клиентская часть

- `/` - главная страница
- `/booking` - мастер записи
- `/booking/hold/:id` - этап оплаты / подтверждения холда
- `/booking/confirm/:id` - страница подтвержденной записи
- `/account` - кабинет клиента

### Админка

- `/admin/login` - вход администратора
- `/admin` - дашборд
- `/admin/barbers` - управление барберами
- `/admin/services` - управление услугами
- `/admin/schedule` - графики и исключения

### Служебные endpoint'ы

- `/health` - proxy на readiness check
- `/health/live` - liveness
- `/health/ready` - readiness
- `/api/v1/metrics` - Prometheus metrics

## Быстрый локальный запуск

### 1. Подготовить переменные окружения backend

Создайте файл `backend/.env` на основе примера:

```bash
cp backend/.env.example backend/.env
```

Для Windows PowerShell:

```powershell
Copy-Item backend\.env.example backend\.env
```

Минимально проверьте эти значения:

```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=barbershop
DB_USER=barber
DB_PASSWORD=REPLACE_WITH_STRONG_DB_PASSWORD
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_JWT_SECRET
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=REPLACE_WITH_ADMIN_PASSWORD
FRONTEND_URL=http://localhost:3000
BACKEND_PUBLIC_URL=http://localhost:3001
PAYMENT_PROVIDER=mock
TELEGRAM_MODE=polling
```

### 2. Поднять стек через Docker

```bash
docker compose up --build
```

После старта будут доступны:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001/api/v1`
- Health: `http://localhost:3001/api/v1/health/live`
- Metrics: `http://localhost:3001/api/v1/metrics`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### 3. Что делает локальный compose

- `backend` выполняет `migration:run`, затем запускает API в watch-режиме.
- `worker` запускает фоновые задачи отдельно от API.
- `frontend` стартует Vite dev server.
- API использует `postgres` и `redis` из compose-сети.

## Запуск без Docker

Подходит, если нужно разрабатывать части системы отдельно. PostgreSQL и Redis при этом должны быть доступны вручную.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run migration:run
npm run start:dev
```

### Worker

```bash
cd backend
npm run start:worker:dev
```

## Полезные команды

### Frontend

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

### Backend

- `npm run start:dev`
- `npm run start:worker:dev`
- `npm run build`
- `npm run start:prod`
- `npm run start:worker`
- `npm run migration:run`
- `npm run migration:run:prod`
- `npm run migration:revert`
- `npm run migration:revert:prod`
- `npm run seed:admin`
- `npm run test`
- `npm run lint`

## Как пользоваться системой

### Клиентский сценарий

1. Откройте `/`.
2. Перейдите в `/booking`.
3. Выберите услугу, барбера и свободный слот.
4. Система создаст `booking hold`.
5. На странице `/booking/hold/:id` завершите оплату депозита.
6. После успешной оплаты запись подтверждается и открывается страница `/booking/confirm/:id`.
7. Доступ к записи сохраняется в локальном кабинете клиента.

### Кабинет клиента

В `/account` доступны два режима:

- регистрация/вход по телефону и PIN;
- ручное открытие записи по `booking id + token`.

Клиент может:

- просматривать свои сохраненные записи;
- открыть запись из списка recent access;
- отменить или перенести запись, если бизнес-правила это позволяют;
- привязать `telegramUsername` для последующих уведомлений.

### Админский сценарий

1. Откройте `/admin/login`.
2. Войдите с `ADMIN_EMAIL` и `ADMIN_PASSWORD` из `backend/.env`.
3. В админке доступны:
- управление барберами;
- управление услугами;
- настройка рабочих графиков и исключений;
- просмотр и изменение статусов бронирований;
- создание admin booking.

## Платежи

Проект поддерживает три режима:

- `PAYMENT_PROVIDER=mock` - локальная разработка и тестовый сценарий без внешнего провайдера.
- `PAYMENT_PROVIDER=stripe` - продовый checkout через Stripe.
- `PAYMENT_PROVIDER=liqpay` - checkout через LiqPay.

Для локальной разработки по умолчанию используется `mock`.

### Обязательные env для Stripe

```env
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PUBLISHABLE_KEY=...
```

### Обязательные env для LiqPay

```env
PAYMENT_PROVIDER=liqpay
LIQPAY_PUBLIC_KEY=...
LIQPAY_PRIVATE_KEY=...
LIQPAY_SANDBOX=false
```

## Production deployment

Production-стек описан в [docker-compose.prod.yml](docker-compose.prod.yml) и включает:

- `postgres`
- `redis`
- `backend`
- `worker`
- `backup`
- `frontend`
- `nginx`
- `prometheus` и `alertmanager` через профиль `observability`

### 1. Подготовить production env

Создайте отдельный файл, например `.env.production`, и не коммитьте его в git.

Минимальный набор:

```env
DB_NAME=barbershop
DB_USER=barber
DB_PASSWORD=<strong database password>
JWT_SECRET=<32+ char secret>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong admin password>
FRONTEND_URL=https://example.com
BACKEND_PUBLIC_URL=https://example.com
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=<secret>
STRIPE_WEBHOOK_SECRET=<webhook secret>
STRIPE_PUBLISHABLE_KEY=<publishable key>
TELEGRAM_MODE=outbound
WORKER_TELEGRAM_MODE=polling
BACKUP_STATUS_FILE=/var/lib/barberbook/backup-state/last-success.json
BACKUP_MAX_AGE_HOURS=24
BACKUP_RETENTION_DAYS=7
BACKUP_INTERVAL_SECONDS=86400
```

Если используете LiqPay, замените платежные переменные на `LIQPAY_PUBLIC_KEY` и `LIQPAY_PRIVATE_KEY`.

### 2. Подготовить TLS-сертификаты

На production-хосте должны существовать:

- `nginx/certs/fullchain.pem`
- `nginx/certs/privkey.pem`

`nginx` слушает `80` и `443`, а HTTP перенаправляется на HTTPS.

### 3. Собрать образы

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

### 4. Выполнить миграции

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrations
```

Это отдельный шаг. Не пропускайте его перед rollout.

### 5. Поднять production-стек

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

### 6. Проверить доступность после деплоя

```bash
curl -fsS https://your-domain/health/live
curl -fsS https://your-domain/health/ready
curl -fsS https://your-domain/api/v1/metrics
```

## Monitoring и observability

Prometheus и Alertmanager можно включить отдельным профилем:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile observability up -d prometheus alertmanager
```

Мониторинг покрывает:

- HTTP request count и latency;
- готовность PostgreSQL и Redis;
- freshness бэкапов;
- worker lag и last success timestamp;
- API 5xx rate и p95 latency через alert rules.

Конфиги находятся в:

- [monitoring/prometheus/prometheus.yml](monitoring/prometheus/prometheus.yml)
- [monitoring/prometheus/alerts.yml](monitoring/prometheus/alerts.yml)
- [monitoring/alertmanager/alertmanager.yml](monitoring/alertmanager/alertmanager.yml)

## Бэкапы и восстановление

В production-compose есть сервис `backup`, который:

- делает `pg_dump -Fc`;
- складывает дампы в `ops/backups/`;
- обновляет `ops/backup-state/last-success.json`;
- удаляет старые дампы по retention policy.

### Ручной бэкап

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backup sh /backup-scripts/backup-postgres.sh
```

### Ручное восстановление

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backup sh /backup-scripts/restore-postgres.sh /backups/<backup-file>.dump
```

Перед критичными миграциями стоит делать дополнительный внеплановый backup.

## Дополнительная документация

- [docs/production.md](docs/production.md) - подробности по production rollout
- [docs/observability.md](docs/observability.md) - мониторинг и alerts
- [docs/backup-restore.md](docs/backup-restore.md) - backup/restore

## Краткие замечания по эксплуатации

- В production API должен работать с `TELEGRAM_MODE=outbound`.
- Telegram polling должен быть включен только у `worker`.
- Для публичных endpoint'ов настроены rate limits через `nginx` и Redis-backed guards.
- Health checks разделены на `live` и `ready`.
- `frontend` в production собирается в статические файлы и обслуживается через nginx внутри контейнера.
- Миграции выполняются отдельным one-off контейнером, а не при каждом старте production API.
