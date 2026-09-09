import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const favoritesRouter = Router();

const favSchema = z.object({
  entityType: z.enum(["character", "build", "team", "guide", "game"]),
  entityId: z.string().uuid(),
});

// ---- GET /api/favorites ----
favoritesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT entity_type, entity_id, created_at FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json({ favorites: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/favorites/toggle ----
favoritesRouter.post("/toggle", requireAuth, async (req, res, next) => {
  try {
    const { entityType, entityId } = favSchema.parse(req.body);
    const existing = await pool.query(
      `SELECT id FROM favorites WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [req.user.id, entityType, entityId]
    );
    if (existing.rowCount > 0) {
      await pool.query(`DELETE FROM favorites WHERE id = $1`, [existing.rows[0].id]);
      return res.json({ favorited: false });
    }
    await pool.query(`INSERT INTO favorites (user_id, entity_type, entity_id) VALUES ($1,$2,$3)`, [req.user.id, entityType, entityId]);
    res.json({ favorited: true });
  } catch (err) {
    next(err);
  }
});
