import { Router } from "express";
import { pool } from "../db/pool.js";

export const charactersRouter = Router();

// ---- GET /api/characters?gameId=&q=&element=&page=&pageSize= ----
charactersRouter.get("/", async (req, res, next) => {
  try {
    const { gameId, q, page = "1", pageSize = "24" } = req.query;
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 24));
    const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * limit;

    const clauses = ["archived_at IS NULL", "is_visible = true"];
    const values = [];
    let i = 1;

    if (gameId) { clauses.push(`game_id = $${i++}`); values.push(gameId); }
    if (q) { clauses.push(`name ILIKE $${i++}`); values.push(`%${q}%`); }
    // Filter on any stats key, e.g. ?element=Pyro maps to stats->>'element'
    for (const key of ["element", "role", "region", "weaponType"]) {
      if (req.query[key]) {
        clauses.push(`stats->>'${key}' = $${i++}`);
        values.push(req.query[key]);
      }
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    values.push(limit, offset);

    const result = await pool.query(
      `SELECT id, game_id, name, slug, rarity, rarity_label, stats, tier, portrait_url
       FROM characters ${where}
       ORDER BY name ASC
       LIMIT $${i++} OFFSET $${i++}`,
      values
    );
    const countResult = await pool.query(
      `SELECT count(*) FROM characters ${where}`,
      values.slice(0, values.length - 2)
    );

    res.json({ characters: result.rows, total: Number(countResult.rows[0].count), page: Number(page), pageSize: limit });
  } catch (err) {
    next(err);
  }
});

// ---- GET /api/characters/:id ----
charactersRouter.get("/:id", async (req, res, next) => {
  try {
    const charResult = await pool.query(
      `SELECT id, game_id, name, slug, rarity, rarity_label, stats, strengths, weaknesses,
              gameplay_notes, tier, release_date, release_version, portrait_url, artwork_url, archived_at
       FROM characters WHERE id = $1`,
      [req.params.id]
    );
    if (charResult.rowCount === 0) return res.status(404).json({ error: "Character not found." });

    const skillsResult = await pool.query(
      `SELECT name, type, description, icon_url FROM character_skills WHERE character_id = $1 ORDER BY sort_order ASC`,
      [req.params.id]
    );

    res.json({ character: { ...charResult.rows[0], skills: skillsResult.rows } });
  } catch (err) {
    next(err);
  }
});
