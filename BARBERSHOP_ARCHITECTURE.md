# BarberBook — Система онлайн-бронювання барбершопу

## Зміст
1. [Огляд проєкту](#огляд-проєкту)
2. [Технологічний стек](#технологічний-стек)
3. [Архітектура системи](#архітектура-системи)
4. [Структура бази даних](#структура-бази-даних)
5. [REST API](#rest-api)
6. [Логіка генерації слотів](#логіка-генерації-слотів)
7. [Telegram-інтеграція](#telegram-інтеграція)
8. [Авторизація адміна](#авторизація-адміна)
9. [Структура файлів проєкту](#структура-файлів-проєкту)
10. [Інструкція по розгортанню](#інструкція-по-розгортанню)
11. [Змінні середовища](#змінні-середовища)

---

## Огляд проєкту

**BarberBook** — повноцінний веб-додаток для онлайн-запису в барбершоп із клієнтською частиною та адмін-панеллю.

### Ключові можливості
- Клієнт бронює час без реєстрації (ім'я + телефон)
- Адмін керує майстрами, послугами, розкладом та статусами записів
- Система автоматично генерує вільні слоти з урахуванням зайнятості
- Захист від подвійного бронювання на рівні бази даних
- Telegram-сповіщення при кожному новому записі
- Повна адаптивність під мобільні пристрої

---

## Технологічний стек

### Frontend
| Технологія | Версія | Призначення |
|---|---|---|
| React | 18.x | UI-фреймворк |
| React Router | 6.x | Клієнтська маршрутизація |
| TanStack Query | 5.x | Серверний стейт, кешування, рефетч |
| Zustand | 4.x | Глобальний стейт (кошик бронювання, авторизація) |
| React Hook Form | 7.x | Форми з валідацією |
| Zod | 3.x | Схеми валідації (shared з backend) |
| Tailwind CSS | 3.x | Utility-first стилі |
| Shadcn/UI | latest | Компонентна бібліотека |
| Day.js | 1.x | Робота з датами |
| Vite | 5.x | Збірник |

### Backend
| Технологія | Версія | Призначення |
|---|---|---|
| Node.js | 20.x LTS | Runtime |
| NestJS | 10.x | Фреймворк (DI, модулі, guards) |
| TypeORM | 0.3.x | ORM для PostgreSQL |
| PostgreSQL | 15.x | Основна БД |
| Redis | 7.x | Кешування слотів, сесії |
| Passport.js + JWT | — | Авторизація адміна |
| class-validator | — | Валідація DTO |
| node-telegram-bot-api | — | Telegram Bot API |
| bcrypt | — | Хешування паролів |
| class-transformer | — | Серіалізація |

### Інфраструктура
| Компонент | Технологія |
|---|---|
| Контейнеризація | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| Змінні середовища | .env + @nestjs/config |

---

## Архітектура системи

```
┌─────────────────────────────────────────────────────────────┐
│                        КЛІЄНТ (браузер)                      │
│                                                              │
│   ┌─────────────────────┐   ┌──────────────────────────┐    │
│   │   CLIENT APP        │   │   ADMIN PANEL            │    │
│   │   /                 │   │   /admin/*               │    │
│   │   React + Tailwind  │   │   React + Tailwind       │    │
│   └──────────┬──────────┘   └────────────┬─────────────┘    │
└──────────────┼──────────────────────────┼──────────────────┘
               │ HTTPS                    │ HTTPS + JWT
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     NGINX (reverse proxy)                     │
│              /api/*  →  NestJS :3001                         │
│              /*      →  React static :3000                   │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    NESTJS APPLICATION :3001                   │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ AuthModule   │ │BookingModule │ │   ServicesModule    │  │
│  │ JWT Guard    │ │ Slots Logic  │ │   CRUD              │  │
│  └──────────────┘ └──────────────┘ └─────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ BarberModule │ │ ScheduleModule│ │  TelegramModule     │  │
│  │ CRUD         │ │ Work Hours   │ │  Notifications      │  │
│  └──────────────┘ └──────────────┘ └─────────────────────┘  │
│                                                              │
│  ┌──────────────────────┐   ┌────────────────────────────┐  │
│  │     TypeORM          │   │         Redis              │  │
│  │   (DB Layer)         │   │   (Slot cache / Locks)     │  │
│  └──────────┬───────────┘   └────────────────────────────┘  │
└─────────────┼───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────┐      ┌──────────────────────────┐
│      PostgreSQL :5432    │      │   Telegram Bot API       │
│      (Primary store)     │      │   (Notifications)        │
└─────────────────────────┘      └──────────────────────────┘
```

### Модульна структура NestJS

```
AppModule
├── AuthModule          — JWT авторизація, login endpoint
├── BookingsModule      — CRUD записів + генерація слотів
├── BarbersModule       — CRUD майстрів
├── ServicesModule      — CRUD послуг
├── ScheduleModule      — Графік роботи майстрів
├── TelegramModule      — Bot notifications (global)
├── DatabaseModule      — TypeORM async config
└── ConfigModule        — .env validation (global)
```

---

## Структура бази даних

### Таблиця `barbers`
```sql
CREATE TABLE barbers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  photo_url   TEXT,
  bio         TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### Таблиця `services`
```sql
CREATE TABLE services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  price        NUMERIC(10, 2) NOT NULL,
  duration_min INTEGER NOT NULL,  -- тривалість у хвилинах
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMP DEFAULT NOW()
);
```

### Таблиця `work_schedules`
```sql
CREATE TABLE work_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id   UUID REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time  TIME NOT NULL,   -- напр. '09:00'
  end_time    TIME NOT NULL,   -- напр. '20:00'
  is_day_off  BOOLEAN DEFAULT false,
  UNIQUE(barber_id, day_of_week)
);
```

### Таблиця `bookings`
```sql
CREATE TABLE bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id    UUID REFERENCES barbers(id),
  service_id   UUID REFERENCES services(id),
  client_name  VARCHAR(100) NOT NULL,
  client_phone VARCHAR(20) NOT NULL,
  start_time   TIMESTAMP NOT NULL,
  end_time     TIMESTAMP NOT NULL,   -- start_time + service.duration_min
  status       VARCHAR(20) DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','canceled','completed')),
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  -- Захист від подвійного бронювання на рівні БД:
  EXCLUDE USING gist (
    barber_id WITH =,
    tsrange(start_time, end_time) WITH &&
  ) WHERE (status NOT IN ('canceled'))
);

-- Індекси для прискорення запитів слотів
CREATE INDEX idx_bookings_barber_date
  ON bookings(barber_id, start_time)
  WHERE status != 'canceled';
```

> **Ключовий момент**: Constraint `EXCLUDE USING GIST` із `tsrange` — це атомарний захист від race condition на рівні PostgreSQL. Навіть якщо два запити прийдуть одночасно, БД відхилить один із них.

---

## REST API

### Базовий URL: `/api/v1`

---

#### Публічні ендпоінти (без авторизації)

| Метод | Endpoint | Опис |
|---|---|---|
| GET | `/services` | Список активних послуг |
| GET | `/barbers` | Список активних майстрів |
| GET | `/barbers/:id/slots?date=YYYY-MM-DD&serviceId=uuid` | Вільні слоти |
| POST | `/bookings` | Створити запис |
| GET | `/bookings/:id` | Статус запису по ID (для клієнта) |

**POST /bookings — тіло запиту:**
```json
{
  "barberId": "uuid",
  "serviceId": "uuid",
  "startTime": "2025-06-15T10:00:00",
  "clientName": "Олексій",
  "clientPhone": "+380671234567",
  "notes": "Перший раз"
}
```

**Відповідь 201:**
```json
{
  "id": "uuid",
  "status": "pending",
  "startTime": "2025-06-15T10:00:00",
  "endTime": "2025-06-15T10:30:00",
  "barber": { "name": "Іван" },
  "service": { "name": "Стрижка", "price": 350 }
}
```

---

#### Адмін-ендпоінти (JWT Bearer Token)

**Auth:**
| Метод | Endpoint | Опис |
|---|---|---|
| POST | `/auth/login` | Login (email + password → JWT) |
| GET | `/auth/me` | Поточний адмін |

**Bookings:**
| Метод | Endpoint | Опис |
|---|---|---|
| GET | `/admin/bookings` | Всі записи (фільтри: date, barberId, status) |
| PATCH | `/admin/bookings/:id/status` | Змінити статус |
| DELETE | `/admin/bookings/:id` | Видалити запис |

**Barbers:**
| Метод | Endpoint | Опис |
|---|---|---|
| GET | `/admin/barbers` | Всі майстри |
| POST | `/admin/barbers` | Створити майстра |
| PATCH | `/admin/barbers/:id` | Оновити майстра |
| DELETE | `/admin/barbers/:id` | Видалити майстра |

**Services:**
| Метод | Endpoint | Опис |
|---|---|---|
| GET | `/admin/services` | Всі послуги |
| POST | `/admin/services` | Створити послугу |
| PATCH | `/admin/services/:id` | Оновити послугу |
| DELETE | `/admin/services/:id` | Видалити послугу |

**Schedule:**
| Метод | Endpoint | Опис |
|---|---|---|
| GET | `/admin/barbers/:id/schedule` | Графік майстра |
| PUT | `/admin/barbers/:id/schedule` | Зберегти графік (повна заміна) |

---

## Логіка генерації слотів

**Endpoint:** `GET /barbers/:id/slots?date=2025-06-15&serviceId=uuid`

```
АЛГОРИТМ generateAvailableSlots(barberId, date, serviceDurationMin):

1. Завантажити work_schedule для barberId на день тижня(date)
   → Якщо вихідний або немає запису → повернути []

2. Завантажити всі активні bookings для barberId на дату date
   → SELECT start_time, end_time FROM bookings
     WHERE barber_id = ? AND DATE(start_time) = ?
     AND status != 'canceled'

3. Генерувати слоти з кроком 30 хвилин (або рівним duration_min):
   current = scheduleStart
   WHILE current + duration <= scheduleEnd:
     slotEnd = current + duration
     IF жоден booking не перетинається з [current, slotEnd):
       slots.push(current)
     current += SLOT_STEP (30 хв)

4. Фільтрувати слоти в минулому (< NOW + 30 хв)

5. Повернути масив ISO timestamp рядків

ЗАХИСТ ВІД RACE CONDITION:
- При POST /bookings використовується транзакція з рівнем SERIALIZABLE
- EXCLUDE USING GIST в БД відхиляє конфліктні INSERT
- Клієнт отримує HTTP 409 Conflict з помилкою "Цей час вже зайнятий"
```

**Приклад відповіді:**
```json
{
  "date": "2025-06-15",
  "barberId": "uuid",
  "serviceDuration": 30,
  "slots": [
    "2025-06-15T09:00:00",
    "2025-06-15T09:30:00",
    "2025-06-15T10:00:00",
    "2025-06-15T11:00:00"
  ]
}
```

---

## Telegram-інтеграція

### Архітектура

```
NestJS TelegramModule (global)
  └── TelegramService
        ├── onModuleInit() → перевірка токена бота
        ├── sendNewBookingAlert(booking) → повідомлення адміну
        └── sendStatusUpdateAlert(booking) → при зміні статусу
```

### Налаштування

1. Створити бота через `@BotFather` → отримати `BOT_TOKEN`
2. Дізнатись свій `CHAT_ID` через `@userinfobot`
3. Додати в `.env`:
   ```
   TELEGRAM_BOT_TOKEN=7123456789:AAF...
   TELEGRAM_ADMIN_CHAT_ID=123456789
   ```

### Шаблон повідомлення

```
🔔 *Новий запис!*

👤 Клієнт: Олексій
📞 Телефон: +38067...
✂️ Послуга: Стрижка + борода (60 хв)
👨‍💼 Майстер: Іван
📅 Дата: 15 червня 2025, 10:00
💰 Вартість: 550 грн

[✅ Підтвердити] [❌ Скасувати]
```

> Кнопки реалізуються через Inline Keyboard + callback_query для керування статусом прямо з Telegram.

---

## Авторизація адміна

### Схема

```
POST /api/v1/auth/login
  Body: { email, password }
  → bcrypt.compare(password, hash)
  → sign JWT({ sub: adminId, role: 'admin' }, SECRET, { expiresIn: '7d' })
  → Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict
  + повернути { accessToken } у тілі (для SPA)
```

### Захист ендпоінтів

```typescript
// NestJS JwtAuthGuard + RolesGuard
@UseGuards(JwtAuthGuard)
@Roles('admin')
@Get('/admin/bookings')
getAll() { ... }
```

### Сид першого адміна

```bash
# Виконати один раз після розгортання:
npm run seed:admin -- --email=admin@barbershop.com --password=SecurePass123
```

---

## Структура файлів проєкту

```
barbershop/
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx/
│   └── nginx.conf
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── main.ts                    # Bootstrap
│       ├── app.module.ts              # Root module
│       │
│       ├── config/
│       │   └── configuration.ts       # Joi validation схема env
│       │
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts     # POST /auth/login
│       │   ├── auth.service.ts        # JWT sign/verify
│       │   ├── jwt.strategy.ts
│       │   ├── jwt-auth.guard.ts
│       │   └── dto/login.dto.ts
│       │
│       ├── barbers/
│       │   ├── barbers.module.ts
│       │   ├── barbers.controller.ts
│       │   ├── barbers.service.ts
│       │   ├── barber.entity.ts
│       │   └── dto/
│       │
│       ├── services/
│       │   ├── services.module.ts
│       │   ├── services.controller.ts
│       │   ├── services.service.ts
│       │   ├── service.entity.ts
│       │   └── dto/
│       │
│       ├── bookings/
│       │   ├── bookings.module.ts
│       │   ├── bookings.controller.ts
│       │   ├── bookings.service.ts    # Slots logic + anti-double-booking
│       │   ├── booking.entity.ts
│       │   └── dto/
│       │
│       ├── schedule/
│       │   ├── schedule.module.ts
│       │   ├── schedule.controller.ts
│       │   ├── schedule.service.ts
│       │   ├── work-schedule.entity.ts
│       │   └── dto/
│       │
│       ├── telegram/
│       │   ├── telegram.module.ts     # Global
│       │   └── telegram.service.ts
│       │
│       └── database/
│           └── database.module.ts
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                    # Router setup
        │
        ├── api/                       # TanStack Query hooks
        │   ├── bookings.ts
        │   ├── barbers.ts
        │   ├── services.ts
        │   └── admin.ts
        │
        ├── store/                     # Zustand stores
        │   ├── bookingStore.ts        # Wizard стан
        │   └── authStore.ts           # Адмін сесія
        │
        ├── pages/
        │   ├── client/
        │   │   ├── HomePage.tsx       # Список послуг
        │   │   ├── BookingWizard.tsx  # Мульти-крок форма
        │   │   └── ConfirmationPage.tsx
        │   └── admin/
        │       ├── LoginPage.tsx
        │       ├── DashboardPage.tsx  # Всі записи
        │       ├── BarbersPage.tsx
        │       ├── ServicesPage.tsx
        │       └── SchedulePage.tsx
        │
        ├── components/
        │   ├── ui/                    # Shadcn компоненти
        │   ├── BookingSteps/
        │   │   ├── Step1Services.tsx
        │   │   ├── Step2Barber.tsx
        │   │   ├── Step3DateTime.tsx
        │   │   └── Step4Confirm.tsx
        │   └── admin/
        │       ├── BookingsTable.tsx
        │       ├── StatusBadge.tsx
        │       └── ScheduleGrid.tsx
        │
        └── lib/
            ├── utils.ts
            └── api-client.ts          # Axios instance + interceptors
```

---

## Інструкція по розгортанню

### Локальна розробка (Docker Compose)

```bash
# 1. Клонуємо репозиторій
git clone https://github.com/your-org/barbershop.git
cd barbershop

# 2. Копіюємо та заповнюємо змінні середовища
cp backend/.env.example backend/.env
# Редагуємо backend/.env (DB, JWT secret, Telegram token)

# 3. Запускаємо всі сервіси
docker compose up -d

# Сервіси піднімуться на:
# Frontend:  http://localhost:3000
# Backend:   http://localhost:3001
# Adminer:   http://localhost:8080  (DB GUI)
# Redis:     localhost:6379

# 4. Запускаємо міграції та сід
docker compose exec backend npm run migration:run
docker compose exec backend npm run seed:admin

# 5. Адмін-панель доступна на:
# http://localhost:3000/admin
```

### docker-compose.yml (dev)

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: barbershop
      POSTGRES_USER: barber
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: ./backend
    environment:
      NODE_ENV: development
    env_file: ./backend/.env
    depends_on: [postgres, redis]
    ports: ["3001:3001"]
    volumes:
      - ./backend/src:/app/src  # hot reload

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    volumes:
      - ./frontend/src:/app/src  # hot reload
    environment:
      VITE_API_URL: http://localhost:3001/api/v1

volumes:
  pgdata:
```

### Production (з Nginx)

```bash
# Збираємо продакшн образи
docker compose -f docker-compose.prod.yml up -d --build

# Nginx роутить:
# /api/*  → backend:3001
# /*      → frontend (статика)
```

---

## Змінні середовища

### `backend/.env`

```ini
# App
NODE_ENV=development
PORT=3001

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=barbershop
DB_USER=barber
DB_PASSWORD=secret

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Admin (initial seed)
ADMIN_EMAIL=admin@barbershop.com
ADMIN_PASSWORD=ChangeMe123!

# Telegram
TELEGRAM_BOT_TOKEN=7123456789:AAFxxxxx
TELEGRAM_ADMIN_CHAT_ID=123456789

# CORS
FRONTEND_URL=http://localhost:3000
```

### `frontend/.env`

```ini
VITE_API_URL=http://localhost:3001/api/v1
```

---

## Клієнтський флоу (Booking Wizard)

```
Крок 1: Вибір послуги
  → GET /services
  → Картки: назва, ціна, тривалість
  → Зберегти в Zustand bookingStore

Крок 2: Вибір майстра
  → GET /barbers
  → Картки майстрів (фото, ім'я, біо)

Крок 3: Вибір дати та часу
  → DatePicker (Calendar UI)
  → При виборі дати: GET /barbers/:id/slots?date=...&serviceId=...
  → Сітка доступних слотів

Крок 4: Контактні дані
  → Форма: ім'я, телефон, нотатки
  → POST /bookings
  → Redirect на /booking/confirm/:id

Сторінка підтвердження:
  → GET /bookings/:id
  → Показати деталі запису + статус
  → "Додати в календар" (iCal link)
```

---

## Адмін-флоу

```
/admin/login
  → POST /auth/login → JWT → зберегти в authStore + cookie

/admin (Dashboard)
  → GET /admin/bookings?date=today
  → Таблиця з фільтрами (дата, майстер, статус)
  → Inline зміна статусу (PATCH /admin/bookings/:id/status)

/admin/barbers
  → CRUD майстрів
  → При натисканні майстра → перехід на його графік

/admin/schedule/:barberId
  → Тижневий редактор (7 рядків × початок/кінець/вихідний)
  → PUT /admin/barbers/:id/schedule

/admin/services
  → CRUD послуг (назва, опис, ціна, тривалість)
```

---

## Схема подій (Event Flow)

```
[Клієнт бронює]
    ↓ POST /bookings
    ↓ Перевірка конфлікту (GIST exclude / SELECT FOR UPDATE)
    ↓ INSERT booking (status: pending)
    ↓ TelegramService.sendNewBookingAlert()
    ↓ → Telegram: повідомлення адміну з кнопками

[Адмін підтверджує в Telegram]
    ↓ callback_query: confirm_{bookingId}
    ↓ PATCH /admin/bookings/:id/status { status: "confirmed" }
    ↓ TelegramService.sendStatusUpdateAlert()

[Адмін підтверджує в панелі]
    ↓ PATCH /admin/bookings/:id/status
    ↓ WebSocket або polling оновлює таблицю
```

---

*Документ згенеровано: 2025. Версія архітектури: 1.0*
