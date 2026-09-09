-- Content provenance + editorial recommendations for reviewed catalog packs.

ALTER TABLE characters ADD COLUMN IF NOT EXISTS source_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS source_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS source_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE domains_stages ADD COLUMN IF NOT EXISTS source_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS equipment_game_kind_name_uidx ON equipment (game_id, kind, name);
CREATE UNIQUE INDEX IF NOT EXISTS materials_game_name_uidx ON materials (game_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS domains_game_kind_name_uidx ON domains_stages (game_id, kind, name);

CREATE TABLE IF NOT EXISTS character_recommendations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN ('weapon','artifact_set','main_stats','substats','talent_priority','team_note')),
  item_name     TEXT NOT NULL,
  rank          INT NOT NULL DEFAULT 0,
  notes         TEXT,
  source_meta   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (character_id, category, item_name)
);
CREATE INDEX IF NOT EXISTS character_recommendations_character_idx ON character_recommendations (character_id, category, rank);
