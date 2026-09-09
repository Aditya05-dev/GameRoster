# Gaming Companion Platform — Backend

Node/Express + PostgreSQL + JWT auth. This is the real backend matching
`/SCHEMA.md` and the Stage 1 frontend demo (`platform.jsx`) — same data
shapes, same rules (unique usernames enforced at the DB level, permanent
User IDs, admin RBAC enforced server-side, no plaintext passwords).

## What's implemented

- **Auth**: signup, login, logout, refresh tokens (httpOnly cookie), password
  change, `/me`. Passwords hashed with bcrypt (12 rounds). Access tokens are
  short-lived JWTs; refresh tokens are stored hashed in `sessions` so they
  can be revoked.
- **Identity**: DB-enforced unique `username` (case-insensitive) and
  permanent `user_id_public` (`USER-XXXXXXX`) that survives username
  changes. Reserved names (`admin`, `system`, etc.) blocked at signup.
- **RBAC**: `requireAuth` / `requireAdmin` / `requireOwnerOrAdmin`
  middleware. The entire `/api/admin/*` router requires admin at the router
  level, not per-route, so a new admin route can't ship unprotected by
  mistake.
- **Content**: games, characters (with skills), builds, teams, favorites,
  farming plans, notifications — all matching the tables in `db/migrations/001_init.sql`.
- **Admin CMS**: create/update/archive/restore games and characters; new
  characters fan out a notification to opted-in users; moderation endpoints
  for users and reports.
- **Security**: helmet, CORS allowlist, rate limiting (tighter on
  `/api/auth`), zod input validation on every write route, parameterized
  queries throughout (no string-built SQL), `honkai-impact-3rd` and
  `tears-of-themis` rejected both by a DB trigger and in the admin route —
  two independent layers, not one.

## What's intentionally not built out further

`equipment`, `materials`, `domains_stages`, `maps`/`map_markers`, `events`,
`guides`, `tier_lists`, `likes`, `bookmarks`, and `reports` all have full
tables in the migration and are ready for routes — I built full CRUD for
the resources the frontend demo actually exercises (auth, games,
characters, builds, teams, favorites, farming plans, notifications, admin)
and left the remaining resources as schema-complete but route-light, since
they follow the exact same pattern as `builds.routes.js` /
`teams.routes.js`. Adding one is: a zod schema, a router file with the
CRUD block, mount it in `app.js`.

## Local setup

```bash
cp .env.example .env
# fill in DATABASE_URL, JWT secrets, and SEED_ADMIN_* values

npm install
npm run migrate   # applies db/migrations/*.sql
npm run seed       # seeds the 6 games + the bootstrap admin account
npm run dev
```

`GET /api/health` should return `{ "ok": true }`.

## Deploying for real

You need a Postgres instance and somewhere to run a long-lived Node
process (this API is not serverless-friendly as written — it holds a
connection pool). Any of these work with no code changes:

**Railway** — easiest path. Create a project, add a PostgreSQL plugin
(gives you `DATABASE_URL` automatically), deploy this folder as a service,
set the remaining env vars from `.env.example` in the service's Variables
tab, then run `npm run migrate && npm run seed` from Railway's shell (or
as a one-off deploy command).

**Render** — create a PostgreSQL instance (copy its "External Database
URL" into `DATABASE_URL`, set `PGSSL=true`), create a Web Service pointed
at this folder with build command `npm install` and start command
`npm start`, add the env vars, then run migrate/seed via Render's shell.

**Supabase** — use Supabase only for the Postgres database (copy the
connection string, `PGSSL=true`), and run this Express app on Railway/
Render/Fly since Supabase itself doesn't host arbitrary Node processes.

**Fly.io** — `fly launch` in this folder, `fly postgres create` and attach
it (sets `DATABASE_URL` for you), `fly secrets set` for the JWT/admin
vars, then `fly deploy`, then `fly ssh console` to run migrate/seed.

After deploying, point the frontend's API base URL at your deployed
backend's `/api` and swap the `window.storage` calls in `platform.jsx`
for real `fetch` calls to these routes — the data shapes were kept
matching specifically so that swap is mechanical rather than a rewrite.

## Testing

```bash
DATABASE_URL=postgres://...your-test-db npm run migrate
DATABASE_URL=postgres://...your-test-db npm test
```

Use a disposable database for tests — they create real rows (though all
test data is randomly suffixed and safe to wipe). Tests cover the identity
requirements the spec is strictest about: duplicate-username rejection,
the actual race condition of two simultaneous signups for the same name,
User ID persistence across a username change, and that admin routes
reject both anonymous and non-admin callers.
