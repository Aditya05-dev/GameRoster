import { pool } from "./pool.js";
import { importCatalog } from "../services/catalogImport.js";
import {
  characters as starterCharacters,
  recommendations as starterRecommendations,
} from "./content/genshin.v1.js";
const curated = {
  skirk: {
    url: "https://keqingmains.com/q/skirk-quickguide/",
    version: "5.7",
    rows: [
      ["weapon", "Azurelight", 1, "Signature option for both playstyles."],
      [
        "weapon",
        "Primordial Jade Cutter",
        2,
        "Alternative; watch CRIT Rate overcapping with Marechaussee.",
      ],
      ["weapon", "Mistsplitter Reforged", 3, "Alternative if already owned."],
      [
        "weapon",
        "Finale of the Deep",
        1,
        "Craftable option. Bring a healer to clear its Bond of Life.",
      ],
      [
        "weapon",
        "Calamity of Eshu",
        2,
        "Event weapon for on-field play; requires a shield.",
      ],
      [
        "artifact_set",
        "Finale of the Deep Galleries",
        1,
        "Flexible set for on-field or Burst-focused play.",
      ],
      [
        "artifact_set",
        "Marechaussee Hunter",
        2,
        "For on-field Furina teams; account for its conditional CRIT Rate.",
      ],
      [
        "main_stats",
        "ATK% / Cryo DMG or ATK% / CRIT",
        1,
        "Balance main stats with your team’s buffs.",
      ],
      ["substats", "CRIT and ATK%", 1, "Avoid overcapping CRIT Rate."],
      [
        "talent_priority",
        "Skill → Burst",
        1,
        "On-field priority; prioritize Burst for quickswap.",
      ],
      [
        "team_note",
        "Hydro and Cryo teammates",
        1,
        "Escoffier, Hydro support, and a Hydro/Cryo flex.",
      ],
    ],
  },
  furina: {
    url: "https://keqingmains.com/q/furina-quickguide/",
    version: "Guide reference",
    rows: [
      [
        "weapon",
        "Splendor of Tranquil Waters",
        1,
        "Personal-damage option once Energy Recharge needs are met.",
      ],
      [
        "weapon",
        "Key of Khaj-Nisut",
        2,
        "Consider for teams that benefit from its EM buff.",
      ],
      [
        "weapon",
        "Fleuve Cendre Ferryman",
        1,
        "Fishing reward with useful Energy Recharge.",
      ],
      [
        "weapon",
        "Favonius Sword",
        2,
        "Prioritizes team Energy needs over personal damage.",
      ],
      [
        "weapon",
        "Festering Desire",
        3,
        "Strong option if you own this past event reward.",
      ],
      ["artifact_set", "Golden Troupe", 1, "For off-field Skill damage."],
      [
        "main_stats",
        "HP% or ER / HP% or Hydro / CRIT",
        1,
        "Meet the rotation’s Energy needs first; Goblet choice depends on investment.",
      ],
      [
        "substats",
        "ER until sufficient → CRIT / HP%",
        1,
        "Energy requirements change with team and rotation.",
      ],
      [
        "team_note",
        "Include reliable healing",
        1,
        "Teamwide healing helps maintain health and build Fanfare.",
      ],
    ],
  },
};
try {
  console.log(await importCatalog(pool));
  const {
    rows: [game],
  } = await pool.query("SELECT id FROM games WHERE slug='genshin-impact'");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const c of starterCharacters)
      await client.query(
        `UPDATE characters SET gameplay_notes=coalesce(gameplay_notes,$3),strengths=CASE WHEN cardinality(strengths)=0 THEN $4 ELSE strengths END,weaknesses=CASE WHEN cardinality(weaknesses)=0 THEN $5 ELSE weaknesses END,stats=CASE WHEN stats?'role' THEN stats ELSE stats||$6::jsonb END WHERE game_id=$1 AND slug=$2`,
        [
          game.id,
          c.slug,
          c.gameplayNotes,
          c.strengths,
          c.weaknesses,
          { role: c.stats.role },
        ],
      );
    for (const [slug, rows] of Object.entries(starterRecommendations)) {
      if (curated[slug]) continue;
      const {
        rows: [character],
      } = await client.query(
        "SELECT id FROM characters WHERE game_id=$1 AND slug=$2",
        [game.id, slug],
      );
      if (!character) continue;
      for (const [category, name, rank, notes] of rows)
        await client.query(
          `INSERT INTO character_recommendations(character_id,category,item_name,rank,notes,source_meta,equipment_id) VALUES($1,$2,$3,$4,$5,$6,(SELECT id FROM equipment WHERE game_id=$7 AND kind=$2 AND name=$3 LIMIT 1)) ON CONFLICT(character_id,category,item_name) DO NOTHING`,
          [
            character.id,
            category,
            name,
            rank,
            notes,
            {
              recommendationType: "Legacy editorial starter guidance",
              pack: "genshin-v1",
            },
            game.id,
          ],
        );
    }
    for (const [slug, guide] of Object.entries(curated)) {
      const {
        rows: [c],
      } = await client.query(
        "SELECT id FROM characters WHERE game_id=$1 AND slug=$2",
        [game.id, slug],
      );
      if (!c) continue;
      for (const [category, name, rank, notes] of guide.rows)
        await client.query(
          `INSERT INTO character_recommendations(character_id,category,item_name,rank,notes,source_meta,equipment_id) VALUES($1,$2,$3,$4,$5,$6,(SELECT id FROM equipment WHERE game_id=$7 AND kind=$2 AND name=$3 LIMIT 1)) ON CONFLICT(character_id,category,item_name) DO NOTHING`,
          [
            c.id,
            category,
            name,
            rank,
            notes,
            {
              url: guide.url,
              version: guide.version,
              recommendationType: "Guide-based starter selection",
              reviewedOn: "2026-09-23",
            },
            game.id,
          ],
        );
    }
    await client.query("COMMIT");
    console.log(
      "Starter guidance installed without overwriting existing editorial changes.",
    );
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
