# Gaming Companion Platform — Database Schema (PostgreSQL)

This is the target relational schema for the real backend (Stage 2). The
Stage 1 demo's client-side data model mirrors these shapes so the two stay
compatible when a real backend is dropped in later.

Conventions: every table has `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
`created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
unless noted. Soft-deletable tables add `archived_at TIMESTAMPTZ NULL`.

## Identity & Access

```sql
users (
  id UUID PK,
  user_id_public TEXT UNIQUE NOT NULL,        -- "USER-8F42K91", permanent, never changes
  username CITEXT UNIQUE NOT NULL,             -- case-insensitive uniqueness, can change
  username_lower TEXT GENERATED ALWAYS AS (lower(username)) STORED,
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                 -- bcrypt/argon2, never plaintext
  role TEXT NOT NULL DEFAULT 'user',           -- 'user' | 'admin' | 'moderator'
  is_active BOOLEAN DEFAULT true,
  created_at, updated_at
)
-- unique index on username_lower guards race conditions at the DB level;
-- registration wraps the insert in a serializable transaction and catches
-- the unique-violation error to return "username taken" instead of a 500.

reserved_usernames ( name TEXT PRIMARY KEY )  -- admin, administrator, support, system, moderator, official...

sessions (
  id UUID PK, user_id FK->users, token_hash TEXT, expires_at, created_at, revoked_at
)

password_reset_tokens (
  id UUID PK, user_id FK->users, token_hash TEXT, expires_at, used_at
)

profiles (
  user_id UUID PK FK->users,
  display_avatar_url TEXT,
  bio TEXT,
  favorite_game_id UUID FK->games NULL,
  visibility TEXT DEFAULT 'public',            -- 'public' | 'private'
  updated_at
)
```

## Catalog: Games (content-driven, no code changes needed for new games)

```sql
games (
  id UUID PK,
  slug TEXT UNIQUE,             -- 'genshin-impact'
  name TEXT,
  short_name TEXT,
  franchise TEXT,                -- 'hoyoverse' | null
  accent_color TEXT,
  entity_schema JSONB,           -- describes which optional entity types/fields this game uses
  is_visible BOOLEAN DEFAULT true,
  sort_order INT,
  archived_at
)
```

`entity_schema` is what makes the platform content-driven per §14 of the
brief: instead of a fixed set of columns shared by every game, each game
row declares which of the generic entity tables it uses and which of the
`stats` JSONB keys apply to its characters (e.g. Genshin uses `element`,
`weapon_type`, `constellations`; Arknights uses `class`, `subclass`,
`faction`, `modules`; ZZZ uses `attribute`, `w_engine`).

## Catalog: Characters / Operators (generic table, game-specific data in JSONB)

```sql
characters (
  id UUID PK,
  game_id FK->games,
  name TEXT,
  slug TEXT,
  rarity TEXT,
  role TEXT,
  faction TEXT,
  release_date DATE,
  release_version TEXT,
  portrait_url TEXT,
  artwork_url TEXT,
  stats JSONB,                   -- game-specific fields per entity_schema
  strengths TEXT[],
  weaknesses TEXT[],
  gameplay_notes TEXT,
  is_visible BOOLEAN DEFAULT true,
  archived_at,
  created_at, updated_at,
  UNIQUE(game_id, slug)
)

character_skills ( id, character_id FK, name, type, description, icon_url, sort_order )
character_upgrades ( id, character_id FK, level_from, level_to, materials JSONB, notes )

equipment (                      -- weapons / light cones / w-engines / echoes / relics / modules
  id, game_id FK, kind TEXT,     -- 'weapon' | 'light_cone' | 'w_engine' | 'echo' | 'relic_set' | 'module' ...
  name, rarity, stats JSONB, effect_text TEXT, portrait_url, archived_at
)

materials ( id, game_id FK, name, category, rarity, source_locations TEXT[], portrait_url )

domains_stages (                 -- domains (Genshin), stages (Arknights), any farmable location
  id, game_id FK, kind TEXT,     -- 'domain' | 'stage' | 'boss'
  name, location TEXT, difficulty TEXT, available_days TEXT[],
  drops UUID[] REFERENCES materials, recommended_character_ids UUID[]
)

maps ( id, game_id FK, name, image_url )
map_markers ( id, map_id FK, category TEXT, x NUMERIC, y NUMERIC, label TEXT, notes TEXT, created_by UUID FK->users NULL )

events ( id, game_id FK, name, description, starts_at, ends_at, version, image_url,
         related_character_ids UUID[], guide_id UUID FK->guides NULL )
```

## User-generated content

```sql
builds (
  id, user_id FK->users, game_id FK, character_id FK,
  title, build_type TEXT,        -- 'dps'|'sub_dps'|'support'|'f2p'|'beginner'|'endgame'
  equipment_ids UUID[], main_stats JSONB, substat_priority TEXT[],
  skill_priority TEXT[], team_recommendation TEXT, notes TEXT,
  visibility TEXT DEFAULT 'private',
  created_at, updated_at
)

teams (
  id, user_id FK->users, game_id FK, name, description, notes,
  character_ids UUID[], visibility TEXT DEFAULT 'private',
  created_at, updated_at
)

guides (
  id, author_id FK->users, game_id FK, category TEXT, title, body TEXT,
  status TEXT DEFAULT 'draft',   -- 'draft'|'published'|'unpublished'|'archived'
  is_featured BOOLEAN DEFAULT false,
  created_at, updated_at
)

tier_lists ( id, game_id FK, title, methodology_notes TEXT, version TEXT, is_published BOOLEAN )
tier_list_tiers ( id, tier_list_id FK, label TEXT, sort_order INT )
tier_list_entries ( id, tier_id FK, character_id FK, explanation TEXT )

farming_plans (
  id, user_id FK->users, game_id FK, character_id FK,
  target_upgrades JSONB, materials_needed JSONB, materials_collected JSONB,
  created_at, updated_at
)
```

## Social / cross-cutting

```sql
favorites ( id, user_id FK->users, entity_type TEXT, entity_id UUID, created_at, UNIQUE(user_id, entity_type, entity_id) )
bookmarks ( id, user_id FK->users, entity_type TEXT, entity_id UUID, created_at, UNIQUE(user_id, entity_type, entity_id) )
likes ( id, user_id FK->users, entity_type TEXT, entity_id UUID, created_at, UNIQUE(user_id, entity_type, entity_id) )
reports ( id, reporter_id FK->users, entity_type TEXT, entity_id UUID, reason TEXT, status TEXT DEFAULT 'open', resolved_by FK->users NULL )
notifications ( id, user_id FK->users, type TEXT, payload JSONB, read_at, created_at )
notification_preferences ( user_id PK FK->users, new_characters BOOLEAN, new_guides BOOLEAN, events BOOLEAN, saved_content_updates BOOLEAN )
announcements ( id, title, body, is_featured, published_at )
```

## Indexes (representative, not exhaustive)

```sql
CREATE UNIQUE INDEX ON users (username_lower);
CREATE UNIQUE INDEX ON users (user_id_public);
CREATE INDEX ON characters (game_id) WHERE archived_at IS NULL;
CREATE INDEX ON characters USING GIN (stats);
CREATE INDEX ON builds (user_id);
CREATE INDEX ON builds (character_id) WHERE visibility = 'public';
CREATE INDEX ON teams (user_id);
CREATE INDEX ON guides (game_id, status);
```

## RBAC enforcement

All write endpoints (`POST/PATCH/DELETE`) check `req.user.role` server-side
in middleware before touching the database — never in frontend components.
Admin-only routes are mounted under `/api/admin/*` and require
`role = 'admin'` at the middleware layer; ownership checks (`build.user_id
= req.user.id`) gate user edits to their own content regardless of role.

## Explicitly excluded from the catalog

`games.slug NOT IN ('honkai-impact-3rd', 'tears-of-themis')` is enforced at
the seed-data and admin-validation layer — these two titles must never be
insertable, not just hidden by a frontend filter.
