# BarberBook Studio

BarberBook Studio is a full-stack appointment platform for a modern barbershop. The project combines a polished public booking flow, a client self-service cabinet for rescheduling and cancelation, and an admin area for managing barbers, services, schedules, and booking statuses.

It is built as a portfolio-ready case: strong visual identity on the frontend, practical CRUD and scheduling logic on the backend, and a deployment setup that can run locally with Docker or behind Nginx in production.

## Project Snapshot

- Public client experience with service selection, barber selection, slot picking, and confirmation flow
- Personal booking cabinet with direct access to recent bookings and self-service management
- Admin panel for barbers, services, schedule management, and booking status updates
- Ukrainian and English UI support with light and dark themes
- Mobile-first responsive client experience
- NestJS backend with PostgreSQL, TypeORM, JWT auth, and Telegram integration hooks

## Visual Direction

The visual language aims to feel editorial rather than generic SaaS:

- expressive serif headlines paired with a cleaner sans-serif body font
- warm sand, clay, olive, and ink palette instead of standard blue/purple UI
- soft gradients and large rounded cards to make the booking flow feel premium
- bold CTA blocks and stronger hierarchy on mobile so the first-screen actions stay obvious

### Portfolio Preview

```text
HOME
Large editorial hero
Bold booking CTA
Visible "My booking" cabinet entry
Service cards + barber showcase + policy/FAQ blocks

BOOKING
4-step appointment flow
Service -> Barber -> Date/Time -> Contact details
Designed to stay usable on small screens without crowded rows

CLIENT CABINET
Recent booking access
Manual open via booking id + token
Fast reschedule / cancel route

ADMIN
Operational dashboard
Barber / service CRUD
Schedule management
Booking status control
```

## Tech Stack

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
- bcrypt
- Telegram Bot API integration points

### Infra

- Docker
- Docker Compose
- Nginx

## Architecture

```text
Client App / Admin App
        |
        v
      Nginx
        |
   +----+----+
   |         |
   v         v
Frontend   NestJS API
             |
        +----+----+
        |         |
        v         v
    PostgreSQL   Redis
```

## Core User Flows

### Client booking flow

1. The user opens the public landing page.
2. They choose a service, barber, and date.
3. Available slots are loaded from the backend.
4. They submit contact details and receive a confirmation page.
5. The booking access token is stored in the client cabinet for later management.

### Client self-service flow

1. The user opens the booking confirmation page or the `/account` cabinet.
2. They access a saved booking or paste `booking id + token`.
3. They can reschedule the visit or cancel it if the booking is still active.

### Admin flow

1. The admin signs in through the protected admin route.
2. They manage services, barbers, and schedules.
3. They monitor bookings and update statuses.

## Mobile UX Notes

The client-facing part was tuned specifically for phones:

- the header collapses into a compact two-row structure
- theme and language switches stay reachable without crowding the nav
- hero sections use smaller type ramps and tighter spacing on narrow screens
- action buttons expand to full width where touch interaction matters most
- cabinet, confirmation, and booking screens avoid side-by-side compression on mobile

## Repository Structure

```text
backend/   NestJS API, entities, modules, migrations
frontend/  React app, client pages, admin pages, stores, UI
nginx/     Reverse proxy configuration
```

## Local Run

### Docker

```bash
docker compose up --build
```

Expected services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

### Backend only

```bash
cd backend
npm install
npm run migration:run
npm run start:dev
```

## Useful Scripts

### Frontend

- `npm run dev`
- `npm run build`

### Backend

- `npm run start:dev`
- `npm run build`
- `npm run migration:run`
- `npm run migration:revert`
- `npm run seed:admin`
- `npm run test`

## Production Notes

- `docker-compose.prod.yml` includes the production stack with Nginx in front
- the backend runs migrations on startup
- the frontend is served behind the reverse proxy
- environment variables should be provided through `backend/.env`

## Standout Pieces

- booking management through personal token access instead of full registration
- multilingual and theme-aware client experience
- clear separation between public booking flow and admin operations
- visual styling designed to present well as a portfolio project, not only as an internal tool

