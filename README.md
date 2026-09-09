# GameRoster — Full-stack Gaming Companion Platform

This package replaces the Stage-1 browser-storage demo with a production-oriented React + Express + PostgreSQL foundation.

## What changed

- Fixed PostgreSQL `pg_trgm` extension ordering before `gin_trgm_ops` index creation.
- Kept permanent public User IDs and case-insensitive unique usernames.
- Removed the need for client-side password hashing / shared browser account storage in the new frontend.
- Added a reusable API client with access-token refresh through the backend refresh cookie.
- Split the monolithic React file into pages, components, API/auth utilities and responsive styling.
- Added frontend pages for home, games, game detail, character detail, builds, guides, farming plans, UID lookup, dashboard, maps and admin CMS.
- Added backend route surfaces for equipment, materials, domains/stages, events, guides, tier lists, bookmarks, likes, reports, maps/markers and UID profile-provider adapters.
- Preserved server-side RBAC for admin/moderator content writes.
- Kept Honkai Impact 3rd and Tears of Themis blocked by seed data and database trigger.
- Preserved the original `LEGACY_PLATFORM.jsx` for reference/migration.

## Project structure

```text
frontend/              Vite + React application
backend/               Express + PostgreSQL API
SCHEMA.md              Original target database design
LEGACY_PLATFORM.jsx    Original Stage-1 monolithic demo
```

## Local setup

### 1. PostgreSQL
Create a PostgreSQL database, then copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`, both JWT secrets, and `CORS_ORIGIN=http://localhost:5173`.

### 2. Backend

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

The API defaults to the port defined in `PORT` (see `.env.example`).

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

`VITE_API_URL` should point to the backend API, normally `http://localhost:4000/api`.

## First admin account

Set `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD` before running `npm run seed`. No hard-coded demo admin password is present in the new frontend.

## UID lookup

The new `/api/profile-lookup` endpoint is intentionally an adapter boundary. Configure a lawful public-profile provider URL using environment variables such as `PROFILE_PROVIDER_GENSHIN_IMPACT`. The frontend never receives provider secrets. Games without a configured provider return a clear `PROVIDER_NOT_CONFIGURED` response rather than fabricated data.

## Content accuracy

The original JSX contains demo seed data, some of which may be inaccurate or outdated. The new frontend does not automatically promote those demo records into PostgreSQL. Populate characters, skills, equipment, domains and maps with reviewed/licensed data through the admin API/CMS.

## Verification status

Backend JavaScript syntax has been checked with `node --check`. A full frontend dependency install/build could not be completed in the execution environment because dependency installation timed out; run `npm install && npm run build` locally or in CI before deployment.
