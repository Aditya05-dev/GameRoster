import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

export const teamsRouter = Router();

const teamSchema = z.object({
  gameId: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  characterIds: z.array(z.string().uuid()).min(1).max(12),
  visibility: z.enum(["public", "private"]).default("private"),
});

// ---- GET /api/teams?gameId=&mine=true ----
teamsRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { gameId, mine } = req.query;
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
    if (gameId) { clauses.push(`game_id = $${i++}`); values.push(gameId); }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT t.*, u.username AS author_username
       FROM teams t JOIN users u ON u.id = t.user_id
       ${where} ORDER BY t.created_at DESC LIMIT 100`,
      values
    );
    res.json({ teams: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/teams ----
teamsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const t = teamSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO teams (user_id, game_id, name, description, notes, character_ids, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, t.gameId, t.name, t.description || null, t.notes || null, t.characterIds, t.visibility]
    );
    res.status(201).json({ team: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- PATCH /api/teams/:id ----
teamsRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await pool.query(`SELECT user_id FROM teams WHERE id = $1`, [req.params.id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: "Team not found." });
    if (existing.rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "You can only edit your own teams." });
    }
    const t = teamSchema.partial().parse(req.body);
    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, col] of [["name", "name"], ["description", "description"], ["notes", "notes"], ["visibility", "visibility"], ["characterIds", "character_ids"]]) {
      if (t[key] !== undefined) { fields.push(`${col} = $${i++}`); values.push(t[key]); }
    }
    if (!fields.length) return res.status(400).json({ error: "No fields to update." });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE teams SET ${fields.join(", ")}, updated_at = now() WHERE id = $${i} RETURNING *`, values);
    res.json({ team: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- DELETE /api/teams/:id ----
teamsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await pool.query(`SELECT user_id FROM teams WHERE id = $1`, [req.params.id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: "Team not found." });
    if (existing.rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "You can only delete your own teams." });
    }
    await pool.query(`DELETE FROM teams WHERE id = $1`, [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
