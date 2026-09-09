import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { notifyAllUsers } from "./notifications.routes.js";

export const adminRouter = Router();

// Every route below requires a valid admin — enforced once, at the router
// level, so a new route can't accidentally ship without the check.
adminRouter.use(requireAuth, requireAdmin);

const BANNED_SLUGS = new Set(["honkai-impact-3rd", "tears-of-themis"]);

/* ---------------- Games ---------------- */
const gameSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  franchise: z.string().optional(),
  accentColor: z.string().optional(),
  entitySchema: z.record(z.any()).optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

adminRouter.post("/games", async (req, res, next) => {
  try {
    const g = gameSchema.parse(req.body);
    if (BANNED_SLUGS.has(g.slug)) {
      return res.status(422).json({ error: "This title is excluded from the platform by policy." });
    }
    const result = await pool.query(
      `INSERT INTO games (slug, name, short_name, franchise, accent_color, entity_schema, is_visible, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [g.slug, g.name, g.shortName, g.franchise || null, g.accentColor || null, g.entitySchema || {}, g.isVisible ?? true, g.sortOrder ?? 0]
    );
    res.status(201).json({ game: result.rows[0] });
  } catch (err) {
    // The DB trigger also rejects banned slugs — this is defense in depth,
    // not the only line of defense.
    next(err);
  }
});

adminRouter.patch("/games/:id", async (req, res, next) => {
  try {
    const g = gameSchema.partial().parse(req.body);
    if (g.slug && BANNED_SLUGS.has(g.slug)) {
      return res.status(422).json({ error: "This title is excluded from the platform by policy." });
    }
    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, col] of [
      ["slug", "slug"], ["name", "name"], ["shortName", "short_name"], ["franchise", "franchise"],
      ["accentColor", "accent_color"], ["entitySchema", "entity_schema"], ["isVisible", "is_visible"], ["sortOrder", "sort_order"],
    ]) {
      if (g[key] !== undefined) { fields.push(`${col} = $${i++}`); values.push(g[key]); }
    }
    if (!fields.length) return res.status(400).json({ error: "No fields to update." });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE games SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`, values);
    if (result.rowCount === 0) return res.status(404).json({ error: "Game not found." });
    res.json({ game: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/games/:id/archive", async (req, res, next) => {
  await pool.query(`UPDATE games SET archived_at = now() WHERE id = $1`, [req.params.id]);
  res.status(204).end();
});
adminRouter.post("/games/:id/restore", async (req, res, next) => {
  await pool.query(`UPDATE games SET archived_at = NULL WHERE id = $1`, [req.params.id]);
  res.status(204).end();
});

/* ---------------- Characters ---------------- */
const characterSchema = z.object({
  gameId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  rarity: z.number().int().min(1).max(6).optional(),
  rarityLabel: z.string().optional(),
  stats: z.record(z.any()).optional(),          // element/weaponType/role/region or game-specific equivalents
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  gameplayNotes: z.string().optional(),
  tier: z.string().optional(),
  releaseDate: z.string().optional(),
  releaseVersion: z.string().optional(),
  portraitUrl: z.string().optional(),
  artworkUrl: z.string().optional(),
  skills: z.array(z.object({ name: z.string(), type: z.string().optional(), description: z.string().optional() })).optional(),
});

adminRouter.post("/characters", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const c = characterSchema.parse(req.body);
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO characters (game_id, name, slug, rarity, rarity_label, stats, strengths, weaknesses,
                                gameplay_notes, tier, release_date, release_version, portrait_url, artwork_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [c.gameId, c.name, c.slug, c.rarity || null, c.rarityLabel || null, c.stats || {}, c.strengths || [], c.weaknesses || [],
       c.gameplayNotes || null, c.tier || null, c.releaseDate || null, c.releaseVersion || null, c.portraitUrl || null, c.artworkUrl || null]
    );
    const character = result.rows[0];
    if (c.skills?.length) {
      for (const [idx, s] of c.skills.entries()) {
        await client.query(
          `INSERT INTO character_skills (character_id, name, type, description, sort_order) VALUES ($1,$2,$3,$4,$5)`,
          [character.id, s.name, s.type || null, s.description || null, idx]
        );
      }
    }
    await client.query("COMMIT");

    const gameResult = await pool.query(`SELECT name FROM games WHERE id = $1`, [c.gameId]);
    await notifyAllUsers("new_character", { gameName: gameResult.rows[0]?.name, characterName: character.name, characterId: character.id }, { onlyIfPreference: "notify_new_characters" });

    res.status(201).json({ character });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

adminRouter.patch("/characters/:id", async (req, res, next) => {
  try {
    const c = characterSchema.partial().parse(req.body);
    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, col] of [
      ["name", "name"], ["slug", "slug"], ["rarity", "rarity"], ["rarityLabel", "rarity_label"], ["stats", "stats"],
      ["strengths", "strengths"], ["weaknesses", "weaknesses"], ["gameplayNotes", "gameplay_notes"], ["tier", "tier"],
      ["releaseDate", "release_date"], ["releaseVersion", "release_version"], ["portraitUrl", "portrait_url"], ["artworkUrl", "artwork_url"],
    ]) {
      if (c[key] !== undefined) { fields.push(`${col} = $${i++}`); values.push(c[key]); }
    }
    if (fields.length) {
      values.push(req.params.id);
      await pool.query(`UPDATE characters SET ${fields.join(", ")}, updated_at = now() WHERE id = $${i}`, values);
    }
    if (c.skills) {
      await pool.query(`DELETE FROM character_skills WHERE character_id = $1`, [req.params.id]);
      for (const [idx, s] of c.skills.entries()) {
        await pool.query(
          `INSERT INTO character_skills (character_id, name, type, description, sort_order) VALUES ($1,$2,$3,$4,$5)`,
          [req.params.id, s.name, s.type || null, s.description || null, idx]
        );
      }
    }
    const result = await pool.query(`SELECT * FROM characters WHERE id = $1`, [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Character not found." });
    res.json({ character: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/characters/:id/archive", async (req, res, next) => {
  await pool.query(`UPDATE characters SET archived_at = now() WHERE id = $1`, [req.params.id]);
  res.status(204).end();
});
adminRouter.post("/characters/:id/restore", async (req, res, next) => {
  await pool.query(`UPDATE characters SET archived_at = NULL WHERE id = $1`, [req.params.id]);
  res.status(204).end();
});

/* ---------------- Tier lists ---------------- */
adminRouter.post("/tier-lists/:tierListId/move", async (req, res, next) => {
  try {
    const { characterId, toTierId, explanation } = req.body;
    await pool.query(`DELETE FROM tier_list_entries WHERE character_id = $1 AND tier_id IN (SELECT id FROM tier_list_tiers WHERE tier_list_id = $2)`, [characterId, req.params.tierListId]);
    await pool.query(`INSERT INTO tier_list_entries (tier_id, character_id, explanation) VALUES ($1,$2,$3)`, [toTierId, characterId, explanation || null]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/* ---------------- Users (moderation) ---------------- */
adminRouter.get("/users", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id_public, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/users/:id/role", async (req, res, next) => {
  try {
    const { role } = z.object({ role: z.enum(["user", "moderator", "admin"]) }).parse(req.body);
    await pool.query(`UPDATE users SET role = $1, updated_at = now() WHERE id = $2`, [role, req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/users/:id/deactivate", async (req, res, next) => {
  await pool.query(`UPDATE users SET is_active = false WHERE id = $1`, [req.params.id]);
  res.status(204).end();
});

/* ---------------- Reports (moderation queue) ---------------- */
adminRouter.get("/reports", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT * FROM reports WHERE status = 'open' ORDER BY created_at ASC`);
    res.json({ reports: result.rows });
  } catch (err) {
    next(err);
  }
});
adminRouter.patch("/reports/:id/resolve", async (req, res, next) => {
  await pool.query(`UPDATE reports SET status = 'resolved', resolved_by = $1 WHERE id = $2`, [req.user.id, req.params.id]);
  res.status(204).end();
});
