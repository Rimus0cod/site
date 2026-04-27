# Комплексный аудит и техническое задание по улучшению production

Дата аудита: 2026-04-25  
Проект: BarberBook Studio  
Область проверки: локальный репозиторий `C:\Users\diff\site`, backend NestJS/TypeORM/PostgreSQL, frontend React/Vite, Docker Compose, nginx.

## 1. Важное ограничение аудита

Аудит выполнен по коду, конфигурации и локальным проверкам. Реальные production-метрики, access/error logs, дамп PostgreSQL, нагрузочные профили, настройки хостинга и фактический TLS/backup setup не предоставлены. Поэтому выводы ниже описывают текущие риски production readiness по репозиторию и должны быть подтверждены наблюдаемостью после внедрения мониторинга.

## 2. Проверки, выполненные во время аудита

| Проверка | Результат |
| --- | --- |
| `backend`: `npm run test` | Успешно, `booking-rules tests passed` |
| `backend`: `npm run build` | Успешно |
| `frontend`: `npm run build` | Успешно после запуска вне sandbox; внутри sandbox падал `esbuild spawn EPERM` |
| `backend`: `npm audit --audit-level=moderate` | `found 0 vulnerabilities` |
| `frontend`: `npm audit --audit-level=moderate` | `found 0 vulnerabilities` |
| `backend`: `npm run lint` | Неуспешно: `eslint` не установлен/не настроен |
| `frontend`: lint script | Отсутствует |

## 3. Краткая архитектура

Текущий стек:

- Frontend: React 18, Vite, TypeScript, Tailwind, TanStack Query, Zustand.
- Backend: NestJS 10, TypeORM, PostgreSQL 15, JWT/cookie auth, Stripe/LiqPay/mock payments, Telegram integration.
- Infra: Docker Compose, nginx reverse proxy, PostgreSQL volume, Redis container.

Ключевые положительные стороны:

- Включён `strict` TypeScript на backend и frontend.
- Есть глобальный `ValidationPipe` с `whitelist`, `transform`, `forbidNonWhitelisted`.
- Body limit ограничен до `10kb`.
- Есть базовые security headers, `x-powered-by` и `etag` отключены.
- Admin/client cookies выставляются как `httpOnly`, `sameSite: "strict"`, `secure` в production.
- База защищает двойное бронирование через PostgreSQL exclusion constraints и `SERIALIZABLE` транзакции.
- Management/access tokens хранятся в базе как SHA-256 hash, а сравнение выполняется через `timingSafeEqual`.
- Stripe webhook валидирует подпись по raw body; LiqPay callback валидирует signature.
- Есть базовый `/api/v1/health`, миграции TypeORM и dependency audit без найденных уязвимостей.

## 4. Основные production-риски

### P0. Production compose и Dockerfile запускают dev-серверы

Файлы:

- `docker-compose.prod.yml`: backend command `npm run migration:run && npm run start:dev`.
- `backend/Dockerfile`: `RUN npm install`, `CMD ["npm", "run", "start:dev"]`.
- `frontend/Dockerfile`: `RUN npm install`, `CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]`.

Риск:

- Backend запускается в watch/dev mode, frontend обслуживается Vite dev server.
- В production попадают devDependencies и исходники.
- Нет multi-stage build, `npm ci`, non-root пользователя, healthcheck, immutable artifact.
- Frontend не раздаётся как статический production bundle.

Что сделать:

- Backend: multi-stage Dockerfile, `npm ci`, `npm run build`, runtime `node dist/main.js`, `NODE_ENV=production`, non-root user.
- Frontend: `npm ci`, `npm run build`, раздача `dist/` через nginx или отдельный static image.
- Миграции запускать отдельным one-off job перед деплоем, а не внутри web container startup.

### P0. Секреты и production defaults небезопасны

Файлы:

- `docker-compose.prod.yml`: `POSTGRES_PASSWORD: secret`.
- `backend/.env.example`: `DB_PASSWORD=secret`, `JWT_SECRET=change-me-to-a-very-long-secret`, `ADMIN_PASSWORD=ChangeMe123!`, `PAYMENT_PROVIDER=mock`.
- `backend/src/config/configuration.ts`: fallback defaults для DB/JWT/admin/payment provider.

Риск:

- При ошибке в env production может стартовать с демонстрационными секретами.
- `mock` payment provider может случайно остаться включённым в production.
- `JWT_SECRET` minimum 16 символов недостаточен как production policy.

Что сделать:

- В production запретить placeholder values на уровне Joi schema.
- Убрать production fallback для `JWT_SECRET`, `ADMIN_PASSWORD`, `DB_PASSWORD`.
- Ввести secret manager или CI/CD secrets.
- Ротировать DB password, admin password, JWT secret перед реальным production.
- Запретить `PAYMENT_PROVIDER=mock` при `NODE_ENV=production`.

### P0. TLS не включён в активном production compose

Файлы:

- `docker-compose.prod.yml`: nginx публикует только `80:80`.
- `nginx/nginx.conf`: активный конфиг HTTP-only.
- `nginx/nginx.https.conf.example`: HTTPS есть только как пример.

Риск:

- Cookies становятся `secure` только на HTTPS, но активный compose не поднимает 443.
- Клиентские и admin-сессии зависят от корректного TLS termination.

Что сделать:

- Активировать HTTPS конфиг в production.
- Добавить Certbot/ACME или использовать TLS termination у провайдера.
- Включить redirect HTTP -> HTTPS, HSTS, автоматическое обновление сертификатов.

### P1. Rate limiting не готов к масштабированию и частично не покрывает endpoints

Файлы:

- `backend/src/common/guards/public-throttle.guard.ts`.
- `backend/src/auth/admin-login-throttle.guard.ts`.
- `backend/src/payments/payments.controller.ts`.
- `backend/src/booking-holds/booking-holds.controller.ts`.

Риск:

- Лимиты хранятся в `static Map`, то есть сбрасываются при рестарте и не работают между несколькими backend instances.
- Bucket map не имеет централизованного TTL cleanup.
- IP берётся из `x-forwarded-for` вручную, что опасно без строгой доверенной proxy-chain.
- В `PublicThrottleGuard` нет правил для `POST /booking-holds`, `POST /payments/checkout`, `POST /payments/mock/:paymentId/complete`, хотя guard на части этих endpoints используется.

Что сделать:

- Перевести rate limit на Redis.
- Использовать доверенный IP из Express/Nest после `trust proxy`, а не сырой header.
- Добавить лимиты для booking holds, checkout, mock payment, webhooks с отдельной политикой.
- Добавить nginx-level rate limit для публичных POST endpoints.

### P1. Background jobs и Telegram polling не рассчитаны на горизонтальное масштабирование

Файлы:

- `backend/src/booking-holds/booking-hold-expiration.service.ts`.
- `backend/src/bookings/booking-reminders.service.ts`.
- `backend/src/payments/payment-reconciliation.service.ts`.
- `backend/src/telegram/telegram.service.ts`.

Риск:

- `setInterval` запускается в каждом backend instance.
- Reminders, payment reconciliation и hold expiration могут выполняться параллельно и дублировать действия.
- Telegram bot использует `{ polling: true }`; несколько API instances с polling будут конфликтовать.

Что сделать:

- Выделить отдельный worker process.
- Перевести jobs на BullMQ/Redis или cron worker с distributed locks.
- Telegram перевести на webhook или single bot worker.
- Все внешние действия сделать идемпотентными и логировать event id/result.

### P1. Нет CI/CD, quality gates и release process

Наблюдение:

- В репозитории нет `.github`, `.gitlab`, `.circleci`, `k8s`, `helm`, `terraform`, `.husky`.
- Backend lint script есть, но не работает.
- Frontend lint script отсутствует.

Риск:

- Production deploy может пройти без тестов, build, audit, typecheck, migration check.
- Ошибки инфраструктуры и security regressions обнаруживаются поздно.

Что сделать:

- Добавить CI pipeline: install, lint, typecheck, tests, build, audit, Docker build.
- Добавить CD pipeline со staging, manual approval для production, image tags по commit SHA.
- Миграции выполнять отдельным шагом с backup/rollback policy.

### P1. Нет наблюдаемости, алертинга и runbook для инцидентов

Файлы:

- `backend/src/health/health.service.ts`.
- `docker-compose.prod.yml`.

Риск:

- Health endpoint проверяет только DB через `SELECT 1`; Redis, payment provider, Telegram и disk space не проверяются.
- В compose нет `healthcheck`.
- Нет structured logs, request id, metrics, tracing, dashboards, alert thresholds.
- Нет backup/restore проверки.

Что сделать:

- Разделить `/health/live` и `/health/ready`.
- Добавить проверки DB, Redis, migration state, worker lag, external provider degradation.
- Подключить Prometheus/OpenTelemetry/Sentry или аналог.
- Добавить alerting по 5xx, p95 latency, DB connections, failed payments, stale reminders, backup age.

### P1. Admin bookings list и некоторые запросы не имеют пагинации

Файл:

- `backend/src/bookings/bookings.service.ts`, `listAdminBookings`.

Риск:

- `getMany()` возвращает все записи.
- Поиск через `LOWER(...) LIKE '%search%'` плохо масштабируется.
- На росте bookings admin dashboard станет медленным, увеличит нагрузку на DB и память API.

Что сделать:

- Добавить `limit`, `cursor` или `page`.
- Добавить индексы под реальные фильтры.
- Для поиска рассмотреть `pg_trgm` index или вынести поиск в отдельный механизм при росте.

### P2. Slot availability делает лишнюю работу на публичном GET

Файл:

- `backend/src/bookings/bookings.service.ts`, `getAvailableSlots`.

Риск:

- Каждый запрос слотов вызывает `expireStaleHolds()`.
- Для дня загружаются все busy bookings/holds, затем слоты считаются в памяти.
- Для небольшого барбершопа это нормально, но публичный endpoint будет первым bottleneck при traffic spikes.

Что сделать:

- Убрать expiration из горячего GET path, оставить worker/job.
- Добавить короткий cache для availability: barberId + serviceId + date.
- Инвалидировать cache при booking/hold/schedule changes.

### P2. Redis присутствует в infra, но почти не используется

Файлы:

- `docker-compose*.yml`.
- `backend/src/config/configuration.ts`.

Риск:

- Есть отдельный сервис Redis, но rate limiting, queues, locks и cache не переведены на него.
- Лишняя инфраструктура без пользы или незакрытая база для будущих ожиданий.

Что сделать:

- Использовать Redis для rate limit, BullMQ jobs, distributed locks, short-lived slot cache.
- Если Redis временно не нужен, убрать из production compose до внедрения.

### P2. Access tokens для бронирований сохраняются в browser storage

Файлы:

- `frontend/src/store/bookingHoldStore.ts`.
- `frontend/src/store/clientPortalStore.ts`.

Риск:

- Booking/hold management tokens persist в localStorage через Zustand persist.
- При XSS пользовательский browser storage даст доступ к управлению бронированиями.

Что сделать:

- Перейти на httpOnly cookie/session для client portal.
- Если token storage остаётся, сократить TTL, добавить clear-on-completion, recovery flow через phone/PIN, CSP и XSS hardening.

### P2. CSRF-защита основана только на SameSite cookie

Файлы:

- `backend/src/auth/auth.controller.ts`.
- `backend/src/client-auth/client-auth.controller.ts`.
- Все cookie-auth mutation endpoints.

Риск:

- `sameSite: "strict"` сильно снижает риск, но для admin/client mutations лучше добавить explicit CSRF token, особенно если появятся subdomains, embedded flows или более сложные OAuth/payment return scenarios.

Что сделать:

- Добавить double-submit CSRF token или synchronizer token для cookie-auth mutations.
- Исключить payment webhooks из CSRF.

### P2. nginx не настроен как полноценный production edge

Файл:

- `nginx/nginx.conf`.

Риск:

- Нет gzip/brotli/static asset cache headers.
- Нет `client_max_body_size`, proxy timeouts, rate limits.
- Нет активного HTTPS.
- Frontend проксируется на Vite dev server.

Что сделать:

- Раздавать frontend static files nginx-ом.
- Добавить cache headers для hashed assets.
- Добавить request body/timeouts/rate limit policies.
- Включить HTTPS конфиг как активный production profile.

### P3. Качество и поддерживаемость

Наблюдения:

- В `backend/src/telegram/telegram.service.ts` есть mojibake-текст для украинской фразы `мої записи`.
- Backend lint script сейчас не работает.
- Frontend не имеет lint/test scripts.
- Тестовое покрытие ограничено `booking-rules.test.ts`.

Что сделать:

- Починить encoding текстов Telegram.
- Настроить ESLint/Prettier для backend/frontend.
- Добавить unit/integration/e2e tests для auth, bookings, holds, payments, webhooks.

## 5. Roadmap улучшения

### Этап 0. Срочная production-stabilization, 1-2 дня

Цель: убрать P0-риски перед любым публичным production.

1. Переписать backend/frontend Dockerfile на production multi-stage.
2. В `docker-compose.prod.yml` заменить dev commands на production runtime.
3. Вынести миграции в отдельный job/command.
4. Включить HTTPS production nginx profile.
5. Запретить placeholder secrets и `PAYMENT_PROVIDER=mock` при `NODE_ENV=production`.
6. Ротировать DB/JWT/admin/payment secrets.
7. Добавить Docker healthcheck для backend, frontend/nginx, postgres, redis.
8. Завести минимальный backup PostgreSQL и инструкцию restore.

### Этап 1. CI/CD baseline, 3-7 дней

Цель: каждый commit проходит одинаковые проверки до деплоя.

1. Добавить GitHub Actions или аналог:
   - `npm ci` для backend/frontend.
   - backend lint, test, build.
   - frontend lint, typecheck/build.
   - `npm audit --audit-level=moderate`.
   - Docker image build.
2. Починить backend lint и добавить frontend lint.
3. Добавить staging environment.
4. Добавить production deploy с manual approval.
5. Тегировать Docker images по commit SHA.
6. Перед production migration делать backup и сохранять migration logs.

### Этап 2. Observability, 1-2 недели

Цель: видеть деградацию до жалоб пользователей.

1. Ввести structured JSON logs.
2. Добавить request id/correlation id через nginx и Nest middleware.
3. Добавить HTTP metrics: RPS, latency, 4xx/5xx, route labels.
4. Добавить DB metrics: pool usage, query latency, slow queries.
5. Добавить business metrics: created holds, expired holds, checkout started, paid payments, failed webhooks, bookings created/canceled/rescheduled.
6. Подключить error tracking: Sentry или аналог.
7. Настроить dashboards и alerts.
8. Добавить uptime check `/health/ready`.

### Этап 3. Масштабирование и отказоустойчивость, 2-4 недели

Цель: безопасно запустить больше одного backend instance.

1. Вынести reminders, hold expiration, payment reconciliation, Telegram в worker.
2. Добавить BullMQ/Redis queues.
3. Добавить distributed locks/idempotency для jobs и external notifications.
4. Перевести rate limiting на Redis.
5. Добавить pagination/cursor для admin bookings.
6. Добавить slot cache с invalidation.
7. Настроить DB connection pool limits и graceful shutdown.
8. Telegram polling заменить на webhook или single worker.

### Этап 4. Security hardening, 2-4 недели

Цель: снизить риск компрометации admin/client flows.

1. Добавить CSRF protection для cookie-auth mutations.
2. Добавить CSP с nonce/hash policy для frontend.
3. Добавить admin MFA.
4. Добавить audit log для admin actions.
5. Пересмотреть хранение booking management tokens в localStorage.
6. Добавить dependency update automation: Renovate/Dependabot.
7. Добавить SAST/secret scanning в CI.
8. Добавить policy для retention/deletion персональных данных.

### Этап 5. Disaster recovery и зрелый release process, 1-2 месяца

Цель: управляемые сбои и предсказуемые восстановления.

1. Настроить ежедневные encrypted backups и point-in-time recovery, если используется managed PostgreSQL.
2. Проводить restore drill минимум раз в месяц.
3. Описать RPO/RTO.
4. Ввести blue/green или rolling deploy.
5. Добавить rollback playbook для app image и DB migration.
6. Добавить load testing перед крупными релизами.

## 6. Техническое задание

### 6.1. Цель

Подготовить проект BarberBook Studio к безопасному production-использованию: исключить dev runtime в production, закрыть базовые security gaps, внедрить CI/CD, мониторинг, backup/restore, масштабируемые фоновые jobs и эксплуатационную документацию.

### 6.2. Объём работ

В объём входят:

- Backend production build/runtime.
- Frontend production build/static serving.
- Docker Compose production profile.
- nginx production edge config.
- Secret management policy.
- CI/CD pipeline.
- Monitoring, logging, alerting.
- Redis-backed rate limiting, queues and locks.
- Backup/restore и runbooks.
- Security hardening для auth, token storage, CSRF, admin actions.

Вне объёма первой итерации:

- Полный переход на Kubernetes.
- Переписывание бизнес-логики бронирования.
- Смена PostgreSQL/TypeORM.
- Полная переработка UI.

### 6.3. Функциональные требования

#### FR-1. Production Docker runtime

- Backend image должен собирать `dist/` и запускать `node dist/main.js`.
- Frontend image должен собирать `dist/` и раздавать статические файлы через nginx.
- В runtime images не должно быть dev server commands: `start:dev`, `vite dev`, `nest start --watch`.
- Использовать `npm ci`, lockfile и multi-stage build.
- Runtime containers должны работать от non-root пользователя.
- Добавить `HEALTHCHECK` или compose-level healthcheck.

Критерии приёмки:

- `docker compose -f docker-compose.prod.yml config` не содержит `start:dev` и `vite`.
- Backend container стартует с `NODE_ENV=production`.
- Frontend открывает production bundle, а не Vite dev server.

#### FR-2. Миграции как отдельный release step

- Убрать запуск миграций из web container startup.
- Добавить отдельную команду/job `migration:run`.
- Перед миграцией production должен выполняться DB backup.
- Migration logs должны сохраняться в CI/CD artifacts или centralized logs.

Критерии приёмки:

- Restart backend не запускает миграции повторно.
- CD pipeline имеет отдельный migration step перед app rollout.
- Есть documented rollback strategy.

#### FR-3. Secret management

- Production env не должен иметь fallback на demo secrets.
- Joi schema должна запрещать `secret`, `ChangeMe123!`, `change-me-to-a-very-long-secret`, пустые payment secrets для выбранного real provider.
- `PAYMENT_PROVIDER=mock` должен быть запрещён при `NODE_ENV=production`.
- Секреты должны храниться в CI/CD secrets или secret manager.

Критерии приёмки:

- Приложение не стартует в production с placeholder secrets.
- `.env` не трекается git, `git ls-files` не содержит env-файлы.
- Документирована процедура ротации JWT/admin/DB/payment secrets.

#### FR-4. HTTPS и nginx edge

- Включить HTTPS production config.
- Добавить redirect HTTP -> HTTPS.
- Добавить HSTS.
- Добавить gzip или brotli.
- Добавить cache headers для hashed frontend assets.
- Добавить `client_max_body_size`, proxy timeouts и rate limits для публичных POST.

Критерии приёмки:

- Production доступен по HTTPS.
- HTTP endpoint делает 301 на HTTPS.
- Security headers видны в ответах nginx.

#### FR-5. CI/CD

- Добавить pipeline на pull request и main branch.
- Backend jobs: `npm ci`, lint, test, build, audit.
- Frontend jobs: `npm ci`, lint, build, audit.
- Docker build job для backend/frontend/nginx.
- CD: staging auto deploy, production manual approval.
- Images тегируются commit SHA.

Критерии приёмки:

- Pull request не может быть смёржен при failed checks.
- `backend npm run lint` и `frontend npm run lint` существуют и проходят.
- Build artifacts/images доступны по SHA.

#### FR-6. Observability

- Добавить structured JSON logs.
- Добавить request id, который прокидывается nginx -> backend -> logs.
- Добавить metrics endpoint или OpenTelemetry exporter.
- Добавить dashboards:
  - API latency p50/p95/p99.
  - 4xx/5xx rate.
  - DB pool usage.
  - booking/payment funnel.
  - worker queue lag.
- Добавить alerts:
  - 5xx > 1% за 5 минут.
  - p95 latency > 500 ms за 10 минут.
  - DB unavailable.
  - backup older than 24 hours.
  - payment webhook failures.
  - reminder worker lag.

Критерии приёмки:

- Есть dashboard для API, DB, workers, payments.
- Есть тестовый alert, подтверждённый в выбранном канале уведомлений.
- `/health/ready` отражает readiness DB/Redis.

#### FR-7. Redis-backed rate limiting

- Заменить in-memory `Map` throttling на Redis-backed store.
- Добавить лимиты для:
  - admin login.
  - client register/login.
  - slot checks.
  - booking hold creation.
  - checkout creation.
  - booking lookup/cancel/reschedule.
  - mock payment completion, если mock остаётся в non-production.
- Не доверять сырому `x-forwarded-for` без proxy policy.

Критерии приёмки:

- Лимиты сохраняются при рестарте backend.
- Лимиты работают одинаково при двух backend instances.
- Покрытие endpoints проверено integration tests.

#### FR-8. Workers and queues

- Вынести фоновые задачи из API process:
  - hold expiration.
  - booking reminders.
  - payment reconciliation.
  - Telegram notifications/bot.
- Использовать BullMQ/Redis или другой queue mechanism.
- Добавить idempotency keys и distributed locks.

Критерии приёмки:

- Можно запустить 2 API instances и 1 worker без дубликатов reminders/payments.
- При падении worker задачи повторяются с retry/backoff.
- Worker lag виден в мониторинге.

#### FR-9. Data performance

- Добавить pagination для admin bookings.
- Добавить индексы под реальные фильтры.
- Проверить `EXPLAIN ANALYZE` для:
  - list admin bookings by date/barber/status/search.
  - slot availability.
  - reminders query.
  - payment reconciliation query.
- Добавить short-lived cache для slot availability.

Критерии приёмки:

- Admin bookings response ограничен `limit`.
- p95 admin bookings query < 200 ms на тестовом наборе данных.
- Slot endpoint выдерживает agreed load test без DB saturation.

#### FR-10. Security hardening

- Добавить CSRF token для cookie-auth mutations.
- Добавить CSP.
- Добавить admin MFA.
- Добавить admin audit log:
  - login/logout.
  - create/update/delete barber/service.
  - schedule changes.
  - booking status changes.
- Пересмотреть хранение management tokens в localStorage.
- Добавить secret scanning/SAST в CI.

Критерии приёмки:

- CSRF test блокирует cross-site mutation.
- Admin audit events пишутся в БД или centralized logs.
- CSP не ломает frontend и блокирует inline script без nonce/hash.

#### FR-11. Backup and disaster recovery

- Настроить daily encrypted PostgreSQL backups.
- Хранить backups вне app host.
- Документировать restore process.
- Выполнять restore drill минимум раз в месяц.
- Определить целевые RPO/RTO.

Предлагаемые цели:

- RPO: 24 часа на старте, затем 1 час при росте платежей.
- RTO: 4 часа на старте, затем 1 час.

Критерии приёмки:

- Есть успешный restore test на staging.
- Backup age monitoring подключён к alerts.
- Restore runbook лежит в репозитории.

### 6.4. Нефункциональные требования

| Область | Требование |
| --- | --- |
| Availability | 99.5% на первом production этапе, цель 99.9% после мониторинга и DR |
| API latency | p95 < 500 ms для публичных GET/POST без внешних payment calls |
| Security | Нет default secrets, HTTPS only, CSRF для cookie mutations, Redis rate limits |
| Reliability | Jobs идемпотентны, retries/backoff, graceful shutdown |
| Observability | Logs + metrics + alerts доступны до production traffic |
| Data safety | Ежедневный backup, restore drill, migration backup gate |

## 7. Рекомендуемый порядок внедрения задач

| Приоритет | Задача | Основные файлы/зоны |
| --- | --- | --- |
| P0 | Production Dockerfiles и compose | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.prod.yml` |
| P0 | HTTPS production nginx | `nginx/nginx.conf`, `nginx/nginx.https.conf.example`, compose volumes/ports |
| P0 | Запрет placeholder secrets | `backend/src/config/configuration.ts`, env docs |
| P0 | Миграции отдельным job | `docker-compose.prod.yml`, CI/CD |
| P1 | CI pipeline + lint baseline | `backend/package.json`, `frontend/package.json`, `.github/workflows/*` |
| P1 | Redis rate limiting | guards, Redis module/config |
| P1 | Worker для jobs/Telegram | booking holds, reminders, payments, telegram modules |
| P1 | Monitoring/alerts | backend middleware, infra dashboards |
| P1 | Backup/restore | infra scripts/docs |
| P2 | Pagination/indexes/cache | bookings service, migrations |
| P2 | CSRF/CSP/localStorage token review | auth controllers, frontend stores, nginx headers |
| P3 | Telegram encoding and extra tests | `backend/src/telegram/telegram.service.ts`, test suites |

## 8. Definition of Done

Проект можно считать готовым к следующему production этапу, когда выполнено:

- `npm run lint`, `npm run test`, `npm run build` проходят для backend.
- `npm run lint`, `npm run build` проходят для frontend.
- `npm audit --audit-level=moderate` проходит для backend/frontend.
- Production compose не содержит dev servers.
- HTTPS включён и проверен.
- Placeholder secrets запрещены.
- CI/CD pipeline зелёный на main.
- Есть staging deployment.
- Есть healthchecks, structured logs, metrics dashboard, alerts.
- Есть PostgreSQL backup и успешный restore drill.
- Rate limiting работает через Redis.
- Background jobs вынесены в worker или защищены distributed locks.
- Admin bookings endpoint имеет pagination.
- Документированы deploy, rollback, migration, incident и restore runbooks.

