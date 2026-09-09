-- Gaming Companion Platform — initial schema
-- Matches /SCHEMA.md at the repo root. Run via `npm run migrate`.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";    -- case-insensitive username/email
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- trigram search / gin_trgm_ops

-- ============================================================
-- Identity & Access
-- ============================================================
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_public    TEXT UNIQUE NOT NULL,           -- "USER-8F42K91", permanent
  username          CITEXT UNIQUE NOT NULL,
  email             CITEXT UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username_idx ON users (username);
CREATE UNIQUE INDEX users_user_id_public_idx ON users (user_id_public);

CREATE TABLE reserved_usernames (
  name TEXT PRIMARY KEY
);
INSERT INTO reserved_usernames (name) VALUES
  ('admin'), ('administrator'), ('support'), ('system'), ('moderator'), ('official')
ON CONFLICT DO NOTHING;

CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE password_reset_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ
);

CREATE TABLE profiles (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_url          TEXT,
  bio                 TEXT,
  favorite_game_id    UUID,
  visibility          TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  notify_new_characters BOOLEAN NOT NULL DEFAULT true,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Catalog: Games (content-driven — new games need no code changes)
-- ============================================================
CREATE TABLE games (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  short_name      TEXT NOT NULL,
  franchise       TEXT,
  accent_color    TEXT,
  entity_schema   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- field labels, team size, etc. (see GAME_CONFIG in the frontend)
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0,
  archived_at     TIMESTAMPTZ
);

ALTER TABLE profiles ADD CONSTRAINT profiles_favorite_game_fk
  FOREIGN KEY (favorite_game_id) REFERENCES games(id) ON DELETE SET NULL;

-- Explicitly excluded titles — enforced here, not just filtered in the UI.
CREATE OR REPLACE FUNCTION reject_banned_game_slugs() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IN ('honkai-impact-3rd', 'tears-of-themis') THEN
    RAISE EXCEPTION 'This title is excluded from the platform by policy: %', NEW.slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER games_reject_banned BEFORE INSERT OR UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION reject_banned_game_slugs();

-- ============================================================
-- Catalog: Characters / Operators
-- ============================================================
CREATE TABLE characters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id           UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  rarity            INT,
  rarity_label      TEXT,                   -- override display, e.g. "S-Class" instead of stars
  stats             JSONB NOT NULL DEFAULT '{}'::jsonb,  -- element/weaponType/role/region or game-specific equivalents
  strengths         TEXT[] NOT NULL DEFAULT '{}',
  weaknesses        TEXT[] NOT NULL DEFAULT '{}',
  gameplay_notes    TEXT,
  tier              TEXT,
  release_date      DATE,
  release_version   TEXT,
  portrait_url      TEXT,
  artwork_url       TEXT,
  is_visible        BOOLEAN NOT NULL DEFAULT true,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, slug)
);
CREATE INDEX characters_game_id_idx ON characters (game_id) WHERE archived_at IS NULL;
CREATE INDEX characters_stats_gin_idx ON characters USING GIN (stats);
CREATE INDEX characters_name_trgm_idx ON characters USING GIN (name gin_trgm_ops);

CREATE TABLE character_skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT,
  description   TEXT,
  icon_url      TEXT,
  sort_order    INT NOT NULL DEFAULT 0
);
CREATE INDEX character_skills_character_id_idx ON character_skills (character_id);

CREATE TABLE equipment (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,   -- 'weapon' | 'light_cone' | 'w_engine' | 'echo' | 'relic_set' | 'module' ...
  name          TEXT NOT NULL,
  rarity        INT,
  stats         JSONB NOT NULL DEFAULT '{}'::jsonb,
  effect_text   TEXT,
  portrait_url  TEXT,
  archived_at   TIMESTAMPTZ
);
CREATE INDEX equipment_game_id_idx ON equipment (game_id);

CREATE TABLE materials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id           UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  category          TEXT,
  rarity            INT,
  source_locations  TEXT[] DEFAULT '{}',
  portrait_url      TEXT
);
CREATE INDEX materials_game_id_idx ON materials (game_id);

CREATE TABLE domains_stages (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id                     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  kind                        TEXT NOT NULL,  -- 'domain' | 'stage' | 'boss'
  name                        TEXT NOT NULL,
  location                    TEXT,
  difficulty                  TEXT,
  available_days              TEXT[] DEFAULT '{}',
  drops                       TEXT,
  recommended_character_ids   UUID[] DEFAULT '{}'
);
CREATE INDEX domains_stages_game_id_idx ON domains_stages (game_id);

CREATE TABLE maps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  image_url   TEXT
);

CREATE TABLE map_markers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id      UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  category    TEXT,
  x           NUMERIC,
  y           NUMERIC,
  label       TEXT,
  notes       TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id                 UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  description             TEXT,
  starts_at               TIMESTAMPTZ,
  ends_at                 TIMESTAMPTZ,
  version                 TEXT,
  image_url               TEXT,
  related_character_ids   UUID[] DEFAULT '{}',
  guide_id                UUID
);
CREATE INDEX events_game_id_idx ON events (game_id);

-- ============================================================
-- User-generated content
-- ============================================================
CREATE TABLE builds (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id               UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  character_id          UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  build_type            TEXT NOT NULL CHECK (build_type IN ('dps','sub_dps','support','f2p','beginner','endgame')),
  equipment_ids         UUID[] DEFAULT '{}',
  main_stats            JSONB DEFAULT '{}'::jsonb,
  substat_priority      TEXT[] DEFAULT '{}',
  skill_priority        TEXT[] DEFAULT '{}',
  team_recommendation   TEXT,
  notes                 TEXT,
  visibility            TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX builds_user_id_idx ON builds (user_id);
CREATE INDEX builds_public_character_idx ON builds (character_id) WHERE visibility = 'public';

CREATE TABLE teams (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id        UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  notes          TEXT,
  character_ids  UUID[] NOT NULL DEFAULT '{}',
  visibility     TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX teams_user_id_idx ON teams (user_id);

CREATE TABLE guides (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  category      TEXT,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','unpublished','archived')),
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX guides_game_status_idx ON guides (game_id, status);

ALTER TABLE events ADD CONSTRAINT events_guide_fk FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE SET NULL;

CREATE TABLE tier_lists (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id               UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  methodology_notes     TEXT,
  version               TEXT,
  is_published          BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE tier_list_tiers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_list_id   UUID NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  sort_order     INT NOT NULL DEFAULT 0
);

CREATE TABLE tier_list_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id        UUID NOT NULL REFERENCES tier_list_tiers(id) ON DELETE CASCADE,
  character_id   UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  explanation    TEXT,
  UNIQUE (tier_id, character_id)
);

CREATE TABLE farming_plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id               UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  character_id          UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  target_upgrades       JSONB DEFAULT '{}'::jsonb,
  materials_needed      JSONB DEFAULT '{}'::jsonb,
  materials_collected   JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX farming_plans_user_id_idx ON farming_plans (user_id);

-- ============================================================
-- Social / cross-cutting
-- ============================================================
CREATE TABLE favorites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE TABLE bookmarks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE TABLE likes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE TABLE reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type    TEXT NOT NULL,
  entity_id      UUID NOT NULL,
  reason         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolved_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_id_idx ON notifications (user_id);

CREATE TABLE announcements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  is_featured    BOOLEAN NOT NULL DEFAULT false,
  published_at   TIMESTAMPTZ DEFAULT now()
);
