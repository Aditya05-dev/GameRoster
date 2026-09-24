import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
export const mapsRouter = Router();
const uuid = z.string().uuid();
mapsRouter.get("/", async (req, res, next) => {
  try {
    const vals = [];
    let where = "m.is_visible AND g.is_visible AND g.archived_at IS NULL";
    if (req.query.gameId) {
      vals.push(uuid.parse(req.query.gameId));
      where += " AND m.game_id=$1";
    }
    const { rows } = await pool.query(
      `SELECT m.* FROM maps m JOIN games g ON g.id=m.game_id WHERE ${where} ORDER BY m.name`,
      vals,
    );
    res.json({ maps: rows });
  } catch (e) {
    next(e);
  }
});
mapsRouter.get("/:id/markers", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT mm.* FROM map_markers mm JOIN maps m ON m.id=mm.map_id JOIN games g ON g.id=m.game_id WHERE mm.map_id=$1 AND m.is_visible AND g.is_visible AND g.archived_at IS NULL ORDER BY category,label",
      [uuid.parse(req.params.id)],
    );
    res.json({ markers: rows });
  } catch (e) {
    next(e);
  }
});
mapsRouter.get("/:id/collected", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT mc.marker_id FROM marker_collections mc JOIN map_markers m ON m.id=mc.marker_id WHERE mc.user_id=$1 AND m.map_id=$2",
      [req.user.id, uuid.parse(req.params.id)],
    );
    res.json({ collected: rows.map((x) => x.marker_id) });
  } catch (e) {
    next(e);
  }
});
mapsRouter.put(
  "/:id/collected/:markerId",
  requireAuth,
  async (req, res, next) => {
    try {
      const mapId = uuid.parse(req.params.id),
        markerId = uuid.parse(req.params.markerId),
        { collected } = z.object({ collected: z.boolean() }).parse(req.body);
      const { rowCount } = await pool.query(
        "SELECT 1 FROM map_markers mm JOIN maps m ON m.id=mm.map_id WHERE mm.id=$1 AND mm.map_id=$2 AND m.is_visible",
        [markerId, mapId],
      );
      if (!rowCount)
        return res.status(404).json({ error: "Marker not found." });
      if (collected)
        await pool.query(
          "INSERT INTO marker_collections(user_id,marker_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [req.user.id, markerId],
        );
      else
        await pool.query(
          "DELETE FROM marker_collections WHERE user_id=$1 AND marker_id=$2",
          [req.user.id, markerId],
        );
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);
const marker = z.object({
  category: z.string().max(80).optional(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  label: z.string().min(1).max(120),
  notes: z.string().max(500).optional(),
});
mapsRouter.post(
  "/:id/markers",
  requireAuth,
  requireRole("admin", "moderator"),
  async (req, res, next) => {
    try {
      const m = marker.parse(req.body);
      const { rows } = await pool.query(
        "INSERT INTO map_markers(map_id,category,x,y,label,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [
          uuid.parse(req.params.id),
          m.category || null,
          m.x,
          m.y,
          m.label,
          m.notes || null,
          req.user.id,
        ],
      );
      res.status(201).json({ marker: rows[0] });
    } catch (e) {
      next(e);
    }
  },
);
