import "dotenv/config";
import { pool } from "./pool.js";
import { SOURCE, characters, equipment, materials, domains, recommendations } from "./content/genshin.v1.js";

async function getGame(client) {
  const r = await client.query(`SELECT id FROM games WHERE slug='genshin-impact' LIMIT 1`);
  if (!r.rowCount) throw new Error("Genshin Impact game row is missing. Run npm run seed first.");
  return r.rows[0].id;
}

async function seedCharacters(client, gameId) {
  const ids = new Map();
  for (const c of characters) {
    const result = await client.query(
      `INSERT INTO characters (game_id,name,slug,rarity,stats,strengths,weaknesses,gameplay_notes,release_version,source_meta,is_visible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
       ON CONFLICT (game_id,slug) DO UPDATE SET
         name=EXCLUDED.name, rarity=EXCLUDED.rarity, stats=EXCLUDED.stats, strengths=EXCLUDED.strengths,
         weaknesses=EXCLUDED.weaknesses, gameplay_notes=EXCLUDED.gameplay_notes,
         release_version=EXCLUDED.release_version, source_meta=EXCLUDED.source_meta,
         archived_at=NULL, is_visible=true, updated_at=now()
       RETURNING id`,
      [gameId,c.name,c.slug,c.rarity,c.stats,c.strengths,c.weaknesses,c.gameplayNotes,c.releaseVersion,SOURCE]
    );
    const id = result.rows[0].id;
    ids.set(c.slug,id);
    await client.query(`DELETE FROM character_skills WHERE character_id=$1`,[id]);
    for (const [idx,s] of c.skills.entries()) {
      await client.query(`INSERT INTO character_skills(character_id,name,type,description,sort_order) VALUES($1,$2,$3,$4,$5)`,[id,s.name,s.type,s.description,idx]);
    }
  }
  return ids;
}

async function seedEquipment(client, gameId) {
  for (const [kind,name,rarity,stats,effectText] of equipment) {
    await client.query(
      `INSERT INTO equipment(game_id,kind,name,rarity,stats,effect_text,source_meta)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (game_id,kind,name) DO UPDATE SET rarity=EXCLUDED.rarity,stats=EXCLUDED.stats,effect_text=EXCLUDED.effect_text,source_meta=EXCLUDED.source_meta,archived_at=NULL`,
      [gameId,kind,name,rarity,stats,effectText,SOURCE]
    );
  }
}

async function seedMaterials(client, gameId) {
  for (const [name,category,rarity,sources] of materials) {
    await client.query(
      `INSERT INTO materials(game_id,name,category,rarity,source_locations,source_meta)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT (game_id,name) DO UPDATE SET category=EXCLUDED.category,rarity=EXCLUDED.rarity,source_locations=EXCLUDED.source_locations,source_meta=EXCLUDED.source_meta`,
      [gameId,name,category,rarity,sources,SOURCE]
    );
  }
}

async function seedDomains(client, gameId) {
  for (const [kind,name,location,difficulty,days,drops] of domains) {
    await client.query(
      `INSERT INTO domains_stages(game_id,kind,name,location,difficulty,available_days,drops,source_meta)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (game_id,kind,name) DO UPDATE SET location=EXCLUDED.location,difficulty=EXCLUDED.difficulty,available_days=EXCLUDED.available_days,drops=EXCLUDED.drops,source_meta=EXCLUDED.source_meta`,
      [gameId,kind,name,location,difficulty,days,drops,SOURCE]
    );
  }
}

async function seedRecommendations(client, ids) {
  const editorialSource={...SOURCE,recommendationType:"editorial starter guidance",metaSensitive:true};
  for (const [slug,rows] of Object.entries(recommendations)) {
    const characterId=ids.get(slug);
    if(!characterId) continue;
    for (const [category,itemName,rank,notes] of rows) {
      await client.query(
        `INSERT INTO character_recommendations(character_id,category,item_name,rank,notes,source_meta)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(character_id,category,item_name) DO UPDATE SET rank=EXCLUDED.rank,notes=EXCLUDED.notes,source_meta=EXCLUDED.source_meta,updated_at=now()`,
        [characterId,category,itemName,rank,notes,editorialSource]
      );
    }
  }
}

async function run(){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const gameId=await getGame(client);
    const ids=await seedCharacters(client,gameId);
    await seedEquipment(client,gameId);
    await seedMaterials(client,gameId);
    await seedDomains(client,gameId);
    await seedRecommendations(client,ids);
    await client.query("COMMIT");
    console.log(`Genshin content pack installed: ${characters.length} characters, ${equipment.length} equipment/artifact entries, ${materials.length} materials, ${domains.length} domains.`);
    console.log("The pack is idempotent: run npm run seed:genshin again after future content updates.");
  }catch(err){await client.query("ROLLBACK");throw err}finally{client.release();await pool.end()}
}
run().catch(err=>{console.error(err);process.exit(1)});
