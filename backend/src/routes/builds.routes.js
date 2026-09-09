import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

export const buildsRouter = Router();

const buildSchema = z.object({
  gameId: z.string().uuid(),
  characterId: z.string().uuid(),
  title: z.string().min(1).max(120),
  buildType: z.enum(["dps", "sub_dps", "support", "f2p", "beginner", "endgame"]),
  equipmentIds: z.array(z.string().uuid()).optional(),
  mainStats: z.record(z.string()).optional(),
  substatPriority: z.array(z.string()).optional(),
  skillPriority: z.array(z.string()).optional(),
  teamRecommendation: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  visibility: z.enum(["public", "private"]).default("private"),
});

// ---- GET /api/builds?characterId=&mine=true ----
buildsRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { characterId, mine } = req.query;
    const clauses = [];
    const values = [];
    let i = 1;

    if (mine === "true") {
      if (!req.user) return res.status(401).json({ error: "Authentication required." });
      clauses.push(`user_id = $${i++}`);
      values.push(req.user.id);
    } else {
      clauses.push(`visibility = 'public'`);
    }
    if (characterId) { clauses.push(`character_id = $${i++}`); values.push(characterId); }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT b.*, u.username AS author_username, c.name AS character_name
       FROM builds b JOIN users u ON u.id = b.user_id JOIN characters c ON c.id = b.character_id
       ${where} ORDER BY b.created_at DESC LIMIT 100`,
      values
    );
    res.json({ builds: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/builds ----
buildsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const b = buildSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO builds (user_id, game_id, character_id, title, build_type, equipment_ids, main_stats,
                            substat_priority, skill_priority, team_recommendation, notes, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.id, b.gameId, b.characterId, b.title, b.buildType, b.equipmentIds || [], b.mainStats || {},
       b.substatPriority || [], b.skillPriority || [], b.teamRecommendation || null, b.notes || null, b.visibility]
    );
    res.status(201).json({ build: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- PATCH /api/builds/:id ----  (owner or admin only)
buildsRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await pool.query(`SELECT user_id FROM builds WHERE id = $1`, [req.params.id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: "Build not found." });
    if (existing.rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "You can only edit your own builds." });
    }
    const b = buildSchema.partial().parse(req.body);
    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, col] of [
      ["title", "title"], ["buildType", "build_type"], ["notes", "notes"], ["visibility", "visibility"],
      ["teamRecommendation", "team_recommendation"],
    ]) {
      if (b[key] !== undefined) { fields.push(`${col} = $${i++}`); values.push(b[key]); }
    }
    if (!fields.length) return res.status(400).json({ error: "No fields to update." });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE builds SET ${fields.join(", ")}, updated_at = now() WHERE id = $${i} RETURNING *`, values);
    res.json({ build: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- DELETE /api/builds/:id ----
buildsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await pool.query(`SELECT user_id FROM builds WHERE id = $1`, [req.params.id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: "Build not found." });
    if (existing.rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "You can only delete your own builds." });
    }
    await pool.query(`DELETE FROM builds WHERE id = $1`, [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
