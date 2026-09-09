import { Router } from "express";
import { pool } from "../db/pool.js";

export const gamesRouter = Router();

// ---- GET /api/games ----
gamesRouter.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, name, short_name, franchise, accent_color, entity_schema, sort_order
       FROM games WHERE is_visible = true AND archived_at IS NULL
       ORDER BY sort_order ASC, name ASC`
    );
    res.json({ games: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---- GET /api/games/:slug ----
gamesRouter.get("/:slug", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, name, short_name, franchise, accent_color, entity_schema
       FROM games WHERE slug = $1 AND is_visible = true AND archived_at IS NULL`,
      [req.params.slug]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Game not found." });
    res.json({ game: result.rows[0] });
  } catch (err) {
    next(err);
  }
});
