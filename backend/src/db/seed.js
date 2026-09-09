import "dotenv/config";
import { pool } from "./pool.js";
import { hashPassword } from "../utils/password.js";
import { generatePublicUserId } from "../utils/publicId.js";

const GAMES = [
  { slug: "genshin-impact", name: "Genshin Impact", short_name: "Genshin", franchise: "HoYoverse", accent_color: "#E3B567",
    entity_schema: { l1: "Element", l2: "Weapon", l3: "Role", l4: "Region", domainWord: "Domains", teamSize: 4, currency: "Resin" }, sort_order: 1 },
  { slug: "honkai-star-rail", name: "Honkai: Star Rail", short_name: "Star Rail", franchise: "HoYoverse", accent_color: "#9B7EDE",
    entity_schema: { l1: "Path", l2: "Combat Type", l3: "Role", l4: "Faction", domainWord: "Calibration Battles", teamSize: 4, currency: "Trailblaze Power" }, sort_order: 2 },
  { slug: "zenless-zone-zero", name: "Zenless Zone Zero", short_name: "ZZZ", franchise: "HoYoverse", accent_color: "#FF3B7D",
    entity_schema: { l1: "Attribute", l2: "Specialty", l3: "Role", l4: "Faction", domainWord: "Hollow Zero Nodes", teamSize: 3, currency: "Battery Charge" }, sort_order: 3 },
  { slug: "wuthering-waves", name: "Wuthering Waves", short_name: "Wuwa", franchise: null, accent_color: "#4FD1C5",
    entity_schema: { l1: "Attribute", l2: "Weapon", l3: "Role", l4: "Faction", domainWord: "Farming Zones", teamSize: 4, currency: "Waveplate" }, sort_order: 4 },
  { slug: "arknights", name: "Arknights", short_name: "Arknights", franchise: null, accent_color: "#F2994A",
    entity_schema: { l1: "Class", l2: "Subclass", l3: "Archetype", l4: "Faction", domainWord: "Stages", teamSize: 6, currency: "Sanity" }, sort_order: 5 },
  { slug: "neverness-to-everness", name: "Neverness to Everness", short_name: "Neverness", franchise: null, accent_color: "#7FA8FF",
    entity_schema: { l1: "Esper Type", l2: "Archetype", l3: "Combat Role", l4: "Affiliation", domainWord: "Anomaly Investigations", teamSize: 4, currency: "Stamina" }, sort_order: 6 },
];
// honkai-impact-3rd and tears-of-themis are never included here — the DB
// trigger from the migration would reject them anyway if someone tried.

async function seedGames() {
  for (const g of GAMES) {
    await pool.query(
      `INSERT INTO games (slug, name, short_name, franchise, accent_color, entity_schema, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, entity_schema = EXCLUDED.entity_schema`,
      [g.slug, g.name, g.short_name, g.franchise, g.accent_color, g.entity_schema, g.sort_order]
    );
  }
  console.log(`Seeded ${GAMES.length} games.`);
}

async function seedAdmin() {
  const existing = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (existing.rowCount > 0) {
    console.log("An admin account already exists — skipping admin seed.");
    return;
  }
  const username = process.env.SEED_ADMIN_USERNAME;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!username || !email || !password) {
    console.log("SEED_ADMIN_USERNAME / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin seed. Set them in .env to bootstrap the first admin.");
    return;
  }
  const passwordHash = await hashPassword(password);
  const userIdPublic = generatePublicUserId();
  const result = await pool.query(
    `INSERT INTO users (user_id_public, username, email, password_hash, role) VALUES ($1,$2,$3,$4,'admin') RETURNING id`,
    [userIdPublic, username, email, passwordHash]
  );
  await pool.query(`INSERT INTO profiles (user_id) VALUES ($1)`, [result.rows[0].id]);
  console.log(`Seeded admin account "${username}" (${userIdPublic}). Change its password after first login.`);
}

async function run() {
  await seedGames();
  await seedAdmin();
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
