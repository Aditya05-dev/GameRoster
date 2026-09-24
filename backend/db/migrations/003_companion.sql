-- Stable provider identity; keep application UUIDs for all user references.
ALTER TABLE characters ADD COLUMN native_id TEXT;
ALTER TABLE characters ADD COLUMN detail JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX characters_native_id ON characters(game_id, native_id) WHERE native_id IS NOT NULL;
ALTER TABLE character_skills ADD COLUMN source_key TEXT;
CREATE UNIQUE INDEX skills_source_key ON character_skills(character_id, source_key) WHERE source_key IS NOT NULL;
CREATE TABLE character_aliases (
  old_id UUID PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE
);
CREATE TABLE catalog_merge_log (
  id BIGSERIAL PRIMARY KEY,
  old_id UUID NOT NULL,
  canonical_id UUID NOT NULL,
  original_record JSONB NOT NULL,
  merged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE equipment ADD COLUMN native_id TEXT;
ALTER TABLE equipment ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE materials ADD COLUMN native_id TEXT;
ALTER TABLE materials ADD COLUMN detail JSONB NOT NULL DEFAULT '{}';
ALTER TABLE materials ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE domains_stages ADD COLUMN native_id TEXT;
ALTER TABLE domains_stages ADD COLUMN detail JSONB NOT NULL DEFAULT '{}';
ALTER TABLE domains_stages ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX equipment_native_id ON equipment(game_id, kind, native_id) WHERE native_id IS NOT NULL;
CREATE UNIQUE INDEX materials_native_id ON materials(game_id, native_id) WHERE native_id IS NOT NULL;
CREATE UNIQUE INDEX domains_native_id ON domains_stages(game_id, native_id) WHERE native_id IS NOT NULL;
ALTER TABLE character_recommendations ADD COLUMN equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL;
ALTER TABLE character_recommendations ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE teams ADD COLUMN slots JSONB NOT NULL DEFAULT '[]';
ALTER TABLE builds ADD COLUMN snapshot JSONB NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN game_server TEXT NOT NULL DEFAULT 'Asia' CHECK (game_server IN ('Asia','Europe','America','TW/HK/MO'));

CREATE TABLE roster (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('owned','wishlist')),
  level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 90),
  constellation INT NOT NULL DEFAULT 0 CHECK (constellation BETWEEN 0 AND 6),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, character_id)
);
CREATE TABLE marker_collections (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marker_id UUID NOT NULL REFERENCES map_markers(id) ON DELETE CASCADE,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, marker_id)
);
ALTER TABLE maps ADD COLUMN source_url TEXT;
ALTER TABLE maps ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE events ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE map_markers ADD CONSTRAINT marker_x_range CHECK(x BETWEEN 0 AND 100) NOT VALID;
ALTER TABLE map_markers ADD CONSTRAINT marker_y_range CHECK(y BETWEEN 0 AND 100) NOT VALID;
CREATE TABLE content_revisions (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resource TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE catalog_imports (
  id BIGSERIAL PRIMARY KEY,
  source_meta JSONB NOT NULL,
  counts JSONB NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
