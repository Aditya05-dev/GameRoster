# GameRoster API

See the root README for setup and deployment. Node 22.17+; PostgreSQL 16+.

## Scripts

- `npm run migrate`: apply ordered SQL migrations.
- `npm run seed`: create supported game hubs and optionally the first admin.
- `npm run seed:genshin`: install the canonical catalog and non-overwriting starter guidance.
- `npm run sync:genshin -- --dry-run`: preview an import inside a rolled-back transaction.
- `npm run sync:genshin`: refresh factual data without replacing recommendations.
- `npm run catalog:build`: regenerate the English snapshot from the pinned build-time data package.
- `npm run test:unit`: data normalization, calculations, server reset, and access checks.
- `npm run test:isolated`: actual migrations and API integration tests in a disposable database.
- `npm test`: integration tests using explicit `TEST_DATABASE_URL`.

## New API surfaces

| Endpoint | Access | Purpose |
|---|---|---|
| `GET /api/catalog/status` | Public | Snapshot provenance and import counts |
| `GET /api/catalog/{resource}` | Public | Paged/filterable equipment, materials, domains, events |
| `GET /api/catalog/{resource}/:id` | Public | Published entry details |
| `POST /api/profile-lookup` | Public, rate limited | `{gameSlug:"genshin-impact",uid:"..."}` public showcase |
| `GET /api/assets/:filename.png` | Public, bounded cache | Allowlisted Enka image filenames; no arbitrary URL proxy |
| `POST /api/companion/calculate` | Public | Character levels, ascensions, and three talent targets |
| `GET /api/companion/schedule?server=Asia` | Public | Daily domain rotation and next server reset |
| `GET /api/companion/roster` | Signed in | Own character collection |
| `PUT /api/companion/roster/:characterId` | Signed in | Upsert own status, level, constellation |
| `DELETE /api/companion/roster/:characterId` | Signed in | Remove own collection entry |
| `GET /api/maps/:id/collected` | Signed in | Own marker collection |
| `PUT /api/maps/:id/collected/:markerId` | Signed in | Mark collected/uncollected |
| `GET/POST /api/admin/content/:resource` | Admin | List all states or create a draft |
| `PATCH /api/admin/content/:resource/:id` | Admin | Validated update plus revision history |
| `GET /api/admin/content/history` | Admin | Recent editorial audit entries |

Existing builds, teams, farming, profiles, notifications, moderation, and authentication routes remain. User-supplied snapshots are validated before rendering. No game account password, cookie, or login token is requested for UID lookup.

Enka cache is process-local, keyed by user-entered UID, deduplicates concurrent requests, and respects provider TTL. A multi-instance deployment should move this cache and rate limits to shared storage if needed. The frontend labels an empty/private showcase and handles unavailable providers without made-up stats.
