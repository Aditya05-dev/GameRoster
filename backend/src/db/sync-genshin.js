import "dotenv/config";
import { pool } from "./pool.js";

const API_BASE = (process.env.GENSHIN_DATA_API || "https://genshin.jmp.blue").replace(/\/$/, "");
const CONCURRENCY = Math.max(1, Math.min(10, Number(process.env.GENSHIN_SYNC_CONCURRENCY || 5)));

const SOURCE_BASE = {
  provider: "genshin.dev",
  providerRepository: "https://github.com/genshindev/api",
  apiBase: API_BASE,
  dataKind: "static game catalog",
  images: "remote API image endpoints; not bundled into GameRoster",
};

async function fetchJson(path) {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "GameRoster/1.0 catalog-sync" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function cleanObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

function sourceMeta(entityType, apiId) {
  return {
    ...SOURCE_BASE,
    entityType,
    apiId,
    importedAt: new Date().toISOString(),
  };
}

async function getGameId(client) {
  const result = await client.query(`SELECT id FROM games WHERE slug='genshin-impact' LIMIT 1`);
  if (!result.rowCount) throw new Error("Genshin Impact is missing from games. Run `npm run seed` first.");
  return result.rows[0].id;
}

async function loadCharacterPayloads() {
  const ids = await fetchJson("/characters");
  if (!Array.isArray(ids)) throw new Error("Unexpected /characters response from genshin.dev.");
  console.log(`Found ${ids.length} character records. Fetching details…`);
  return mapLimit(ids, CONCURRENCY, async (apiId) => {
    const detail = await fetchJson(`/characters/${encodeURIComponent(apiId)}?lang=en`);
    return { apiId, detail };
  });
}

async function loadWeaponPayloads() {
  const ids = await fetchJson("/weapons");
  if (!Array.isArray(ids)) throw new Error("Unexpected /weapons response from genshin.dev.");
  console.log(`Found ${ids.length} weapon records. Fetching details…`);
  return mapLimit(ids, CONCURRENCY, async (apiId) => {
    const detail = await fetchJson(`/weapons/${encodeURIComponent(apiId)}?lang=en`);
    return { apiId, detail };
  });
}

async function upsertCharacter(client, gameId, { apiId, detail }) {
  const stats = cleanObject({
    element: detail.vision || detail.element,
    weaponType: detail.weapon || detail.weapon_type,
    region: detail.nation || detail.region,
    affiliation: detail.affiliation,
    title: detail.title,
    constellation: detail.constellation,
    birthday: detail.birthday,
    description: detail.description,
    apiId,
  });

  const rarity = Number(detail.rarity) || null;
  const portraitUrl = `${API_BASE}/characters/${encodeURIComponent(apiId)}/icon`;
  const artworkUrl = `${API_BASE}/characters/${encodeURIComponent(apiId)}/card`;
  const meta = sourceMeta("character", apiId);

  const result = await client.query(
    `INSERT INTO characters
       (game_id,name,slug,rarity,portrait_url,artwork_url,stats,source_meta,is_visible)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
     ON CONFLICT (game_id,slug) DO UPDATE SET
       name=EXCLUDED.name,
       rarity=EXCLUDED.rarity,
       portrait_url=EXCLUDED.portrait_url,
       artwork_url=EXCLUDED.artwork_url,
       stats=COALESCE(characters.stats,'{}'::jsonb) || EXCLUDED.stats,
       source_meta=COALESCE(characters.source_meta,'{}'::jsonb) || EXCLUDED.source_meta,
       archived_at=NULL,
       is_visible=true,
       updated_at=now()
     RETURNING id`,
    [gameId, detail.name || apiId, apiId, rarity, portraitUrl, artworkUrl, stats, meta]
  );

  const characterId = result.rows[0].id;
  const talents = Array.isArray(detail.skillTalents) ? detail.skillTalents : [];
  if (talents.length) {
    await client.query(`DELETE FROM character_skills WHERE character_id=$1`, [characterId]);
    for (const [index, talent] of talents.entries()) {
      await client.query(
        `INSERT INTO character_skills(character_id,name,type,description,icon_url,sort_order)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [
          characterId,
          talent.name || `Talent ${index + 1}`,
          talent.unlock || talent.type || "Talent",
          talent.description || "",
          null,
          index,
        ]
      );
    }
  }
}

async function upsertWeapon(client, gameId, { apiId, detail }) {
  const stats = cleanObject({
    weaponType: detail.type,
    baseAttack: detail.baseAttack,
    secondaryStat: detail.subStat,
    location: detail.location,
    ascensionMaterial: detail.ascensionMaterial,
    apiId,
  });
  const effectText = [detail.passiveName, detail.passiveDesc].filter(Boolean).join(" — ") || null;
  const portraitUrl = `${API_BASE}/weapons/${encodeURIComponent(apiId)}/icon`;
  const meta = sourceMeta("weapon", apiId);

  await client.query(
    `INSERT INTO equipment(game_id,kind,name,rarity,stats,effect_text,portrait_url,source_meta)
     VALUES($1,'weapon',$2,$3,$4,$5,$6,$7)
     ON CONFLICT (game_id,kind,name) DO UPDATE SET
       rarity=EXCLUDED.rarity,
       stats=COALESCE(equipment.stats,'{}'::jsonb) || EXCLUDED.stats,
       effect_text=EXCLUDED.effect_text,
       portrait_url=EXCLUDED.portrait_url,
       source_meta=COALESCE(equipment.source_meta,'{}'::jsonb) || EXCLUDED.source_meta,
       archived_at=NULL`,
    [gameId, detail.name || apiId, Number(detail.rarity) || null, stats, effectText, portraitUrl, meta]
  );
}

async function run() {
  console.log(`Genshin catalog source: ${API_BASE}`);
  const [characters, weapons] = await Promise.all([loadCharacterPayloads(), loadWeaponPayloads()]);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const gameId = await getGameId(client);

    for (const payload of characters) await upsertCharacter(client, gameId, payload);
    for (const payload of weapons) await upsertWeapon(client, gameId, payload);

    await client.query("COMMIT");
    console.log(`Genshin sync complete: ${characters.length} characters and ${weapons.length} weapons.`);
    console.log("Existing editorial strengths/build recommendations are preserved; factual catalog fields and images are refreshed.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Genshin sync failed:", error);
  process.exit(1);
});
