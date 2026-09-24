import { readFileSync } from "node:fs";
export const catalog = JSON.parse(
  readFileSync(new URL("../data/genshin.json", import.meta.url)),
);
const legacySlugs = {
  "kaedehara-kazuha": ["kazuha"],
  "raiden-shogun": ["raiden"],
  "kamisato-ayaka": ["ayaka"],
  "kamisato-ayato": ["ayato"],
  "sangonomiya-kokomi": ["kokomi"],
  "arataki-itto": ["itto"],
  "shikanoin-heizou": ["heizou"],
};

export async function mergeCharacter(client, oldId, canonicalId) {
  if (oldId === canonicalId) return;
  await client.query(
    `INSERT INTO catalog_merge_log(old_id,canonical_id,original_record) SELECT id,$2,jsonb_build_object('character',to_jsonb(c),'skills',(SELECT coalesce(jsonb_agg(s),'[]') FROM character_skills s WHERE character_id=c.id),'recommendations',(SELECT coalesce(jsonb_agg(r),'[]') FROM character_recommendations r WHERE character_id=c.id)) FROM characters c WHERE id=$1`,
    [oldId, canonicalId],
  );
  for (const table of ["builds", "farming_plans"])
    await client.query(
      `UPDATE ${table} SET character_id=$2 WHERE character_id=$1`,
      [oldId, canonicalId],
    );
  for (const [table, col] of [
    ["teams", "character_ids"],
    ["events", "related_character_ids"],
    ["domains_stages", "recommended_character_ids"],
  ]) {
    await client.query(
      `UPDATE ${table} SET ${col}=ARRAY(SELECT v FROM unnest(array_replace(${col},$1::uuid,$2::uuid)) WITH ORDINALITY a(v,n) GROUP BY v ORDER BY min(n)) WHERE $1::uuid=ANY(${col})`,
      [oldId, canonicalId],
    );
  }
  await client.query(
    `UPDATE teams SET slots=(SELECT coalesce(jsonb_agg(mapped ORDER BY n),'[]') FROM (SELECT DISTINCT ON (mapped->>'characterId') mapped,n FROM (SELECT CASE WHEN s->>'characterId'=$1 THEN jsonb_set(s,'{characterId}',to_jsonb($2::text)) ELSE s END AS mapped,n FROM jsonb_array_elements(slots) WITH ORDINALITY a(s,n)) transformed ORDER BY mapped->>'characterId',n) deduplicated) WHERE slots @> jsonb_build_array(jsonb_build_object('characterId',$1::text))`,
    [oldId, canonicalId],
  );
  await client.query(
    `UPDATE builds SET snapshot=jsonb_set(snapshot,'{characterId}',to_jsonb($2::text)) WHERE snapshot->>'characterId'=$1`,
    [oldId, canonicalId],
  );
  for (const table of ["favorites", "bookmarks", "likes"]) {
    await client.query(
      `DELETE FROM ${table} old USING ${table} keep WHERE old.entity_type='character' AND old.entity_id=$1 AND keep.entity_type='character' AND keep.entity_id=$2 AND old.user_id=keep.user_id`,
      [oldId, canonicalId],
    );
    await client.query(
      `UPDATE ${table} SET entity_id=$2 WHERE entity_type='character' AND entity_id=$1`,
      [oldId, canonicalId],
    );
  }
  await client.query(
    `UPDATE reports SET entity_id=$2 WHERE entity_type='character' AND entity_id=$1`,
    [oldId, canonicalId],
  );
  await client.query(
    `INSERT INTO roster(user_id,character_id,status,level,constellation) SELECT user_id,$2,status,level,constellation FROM roster WHERE character_id=$1 ON CONFLICT(user_id,character_id) DO UPDATE SET status=CASE WHEN roster.status='owned' OR EXCLUDED.status='owned' THEN 'owned' ELSE 'wishlist' END,level=greatest(roster.level,EXCLUDED.level),constellation=greatest(roster.constellation,EXCLUDED.constellation)`,
    [oldId, canonicalId],
  );
  await client.query(
    `INSERT INTO tier_list_entries(tier_id,character_id,explanation) SELECT tier_id,$2,explanation FROM tier_list_entries WHERE character_id=$1 ON CONFLICT(tier_id,character_id) DO NOTHING`,
    [oldId, canonicalId],
  );
  await client.query(
    `INSERT INTO character_recommendations(character_id,category,item_name,rank,notes,source_meta,equipment_id,is_visible) SELECT $2,category,item_name,rank,notes,source_meta,equipment_id,is_visible FROM character_recommendations WHERE character_id=$1 ON CONFLICT(character_id,category,item_name) DO NOTHING`,
    [oldId, canonicalId],
  );
  await client.query(
    `INSERT INTO character_skills(character_id,name,type,description,icon_url,sort_order) SELECT $2,name,type,description,icon_url,sort_order FROM character_skills s WHERE character_id=$1 AND source_key IS NULL AND NOT EXISTS(SELECT 1 FROM character_skills t WHERE t.character_id=$2 AND t.name=s.name)`,
    [oldId, canonicalId],
  );
  await client.query(
    `UPDATE characters c SET strengths=ARRAY(SELECT DISTINCT unnest(c.strengths||o.strengths)),weaknesses=ARRAY(SELECT DISTINCT unnest(c.weaknesses||o.weaknesses)),gameplay_notes=coalesce(c.gameplay_notes,o.gameplay_notes),tier=coalesce(c.tier,o.tier),is_visible=c.is_visible AND o.is_visible,archived_at=coalesce(c.archived_at,o.archived_at) FROM characters o WHERE o.id=$1 AND c.id=$2`,
    [oldId, canonicalId],
  );
  await client.query(
    "UPDATE character_aliases SET character_id=$2 WHERE character_id=$1",
    [oldId, canonicalId],
  );
  await client.query(
    "INSERT INTO character_aliases(old_id,character_id) VALUES($1,$2) ON CONFLICT(old_id) DO UPDATE SET character_id=$2",
    [oldId, canonicalId],
  );
  await client.query("DELETE FROM characters WHERE id=$1", [oldId]);
}

export async function importCatalog(
  pool,
  data = catalog,
  { dryRun = false } = {},
) {
  const client = await pool.connect();
  const counts = {
    characters: 0,
    equipment: 0,
    materials: 0,
    domains: 0,
    merged: 0,
  };
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('gameroster-genshin-import'))",
    );
    const {
      rows: [game],
    } = await client.query("SELECT id FROM games WHERE slug='genshin-impact'");
    if (!game) throw new Error("Run npm run seed to create the game first.");
    for (const c of data.characters) {
      const { rows } = await client.query(
        `SELECT id,native_id FROM characters WHERE game_id=$1 AND (native_id=$2 OR (native_id IS NULL AND (lower(name)=lower($3) OR slug=ANY($4::text[])))) ORDER BY (native_id=$2) DESC NULLS LAST, created_at, id`,
        [game.id, c.nativeId, c.name, [c.slug, ...(legacySlugs[c.slug] || [])]],
      );
      let id = rows[0]?.id;
      for (const duplicate of rows.slice(1)) {
        await mergeCharacter(client, duplicate.id, id);
        counts.merged++;
      }
      if (!id)
        ({
          rows: [{ id }],
        } = await client.query(
          `INSERT INTO characters(game_id,name,slug,native_id) VALUES($1,$2,$3,$4) RETURNING id`,
          [game.id, c.name, c.slug, c.nativeId],
        ));
      const { skills, ...detail } = c.detail;
      await client.query(
        `UPDATE characters SET native_id=$2,name=$3,slug=$4,rarity=$5,stats=stats||$6::jsonb,portrait_url=$7,artwork_url=$8,release_version=$9,detail=$10,source_meta=$11,updated_at=now() WHERE id=$1`,
        [
          id,
          c.nativeId,
          c.name,
          c.slug,
          c.rarity,
          c.stats,
          c.portrait,
          c.artwork,
          c.version,
          detail,
          c.sourceMeta,
        ],
      );
      for (const s of skills) {
        await client.query(
          `UPDATE character_skills SET source_key=$3 WHERE id=(SELECT id FROM character_skills WHERE character_id=$1 AND name=$2 AND source_key IS NULL ORDER BY id LIMIT 1) AND NOT EXISTS(SELECT 1 FROM character_skills WHERE character_id=$1 AND source_key=$3)`,
          [id, s.name, s.key],
        );
        await client.query(
          `INSERT INTO character_skills(character_id,source_key,name,type,description,icon_url,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(character_id,source_key) WHERE source_key IS NOT NULL DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,description=EXCLUDED.description,icon_url=EXCLUDED.icon_url,sort_order=EXCLUDED.sort_order`,
          [id, s.key, s.name, s.type, s.description, s.icon, s.order],
        );
      }
      counts.characters++;
    }
    for (const e of data.equipment) {
      await client.query(
        `UPDATE equipment SET name=$4 WHERE game_id=$1 AND kind=$3 AND native_id=$2 AND name<>$4`,
        [game.id, e.nativeId, e.kind, e.name],
      );
      await client.query(
        `INSERT INTO equipment(game_id,native_id,kind,name,rarity,stats,effect_text,portrait_url,source_meta) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(game_id,kind,name) DO UPDATE SET native_id=EXCLUDED.native_id,rarity=EXCLUDED.rarity,stats=equipment.stats||EXCLUDED.stats,effect_text=EXCLUDED.effect_text,portrait_url=EXCLUDED.portrait_url,source_meta=EXCLUDED.source_meta`,
        [
          game.id,
          e.nativeId,
          e.kind,
          e.name,
          e.rarity,
          e.stats,
          e.effect,
          e.portrait,
          e.sourceMeta,
        ],
      );
      counts.equipment++;
    }
    for (const m of data.materials) {
      await client.query(
        `UPDATE materials SET name=$3 WHERE game_id=$1 AND native_id=$2 AND name<>$3`,
        [game.id, m.nativeId, m.name],
      );
      await client.query(
        `INSERT INTO materials(game_id,native_id,name,category,rarity,source_locations,portrait_url,detail,source_meta) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(game_id,name) DO UPDATE SET native_id=EXCLUDED.native_id,category=EXCLUDED.category,rarity=EXCLUDED.rarity,source_locations=EXCLUDED.source_locations,portrait_url=EXCLUDED.portrait_url,detail=EXCLUDED.detail,source_meta=EXCLUDED.source_meta`,
        [
          game.id,
          m.nativeId,
          m.name,
          m.category,
          m.rarity,
          m.sources,
          m.portrait,
          m.detail,
          m.sourceMeta,
        ],
      );
      counts.materials++;
    }
    for (const d of data.domains) {
      await client.query(
        `UPDATE domains_stages SET name=$3 WHERE game_id=$1 AND native_id=$2 AND name<>$3`,
        [game.id, d.nativeId, d.name],
      );
      await client.query(
        `INSERT INTO domains_stages(game_id,native_id,kind,name,location,difficulty,available_days,drops,detail,source_meta) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(game_id,kind,name) DO UPDATE SET native_id=EXCLUDED.native_id,location=EXCLUDED.location,difficulty=EXCLUDED.difficulty,available_days=EXCLUDED.available_days,drops=EXCLUDED.drops,detail=EXCLUDED.detail,source_meta=EXCLUDED.source_meta`,
        [
          game.id,
          d.nativeId,
          d.kind,
          d.name,
          d.location,
          d.difficulty,
          d.days,
          d.drops,
          d.detail,
          d.sourceMeta,
        ],
      );
      counts.domains++;
    }
    await client.query(
      `UPDATE character_recommendations r SET equipment_id=e.id FROM equipment e,characters c WHERE r.character_id=c.id AND c.game_id=e.game_id AND e.name=r.item_name AND r.category=e.kind AND r.equipment_id IS NULL`,
    );
    await client.query(
      "INSERT INTO catalog_imports(source_meta,counts) VALUES($1,$2)",
      [data.meta, counts],
    );
    await client.query(dryRun ? "ROLLBACK" : "COMMIT");
    return { ...counts, dryRun };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
