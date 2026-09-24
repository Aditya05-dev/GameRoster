import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
export const charactersRouter = Router();
charactersRouter.get("/", async (req, res, next) => {
  try {
    const q = z
      .object({
        gameId: z.string().uuid().optional(),
        q: z.string().max(100).optional(),
        element: z.string().optional(),
        role: z.string().optional(),
        region: z.string().optional(),
        weaponType: z.string().optional(),
        rarity: z.coerce.number().int().min(1).max(6).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(250).default(24),
        sort: z.enum(["name", "rarity", "newest"]).default("name"),
      })
      .parse(req.query);
    const values = [],
      where = [
        "c.is_visible",
        "c.archived_at IS NULL",
        "g.is_visible",
        "g.archived_at IS NULL",
      ];
    const add = (sql, value) => {
      values.push(value);
      where.push(sql.replace("?", `$${values.length}`));
    };
    if (q.gameId) add("c.game_id=?", q.gameId);
    if (q.q) add("c.name ILIKE ?", `%${q.q}%`);
    if (q.rarity) add("c.rarity=?", q.rarity);
    for (const key of ["element", "role", "region", "weaponType"])
      if (q[key]) add(`c.stats->>'${key}'=?`, q[key]);
    const clause = where.join(" AND ");
    const order = {
      name: "c.name",
      rarity: "c.rarity DESC NULLS LAST,c.name",
      newest:
        "string_to_array(NULLIF(c.release_version,''),'.')::int[] DESC NULLS LAST,c.name",
    }[q.sort];
    const {
      rows: [{ count }],
    } = await pool.query(
      `SELECT count(*) FROM characters c JOIN games g ON g.id=c.game_id WHERE ${clause}`,
      values,
    );
    const { rows } = await pool.query(
      `SELECT c.id,c.native_id,c.game_id,c.name,c.slug,c.rarity,c.rarity_label,c.stats,c.tier,c.portrait_url,c.release_version FROM characters c JOIN games g ON g.id=c.game_id WHERE ${clause} ORDER BY ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, q.pageSize, (q.page - 1) * q.pageSize],
    );
    res.json({
      characters: rows,
      total: Number(count),
      page: q.page,
      pageSize: q.pageSize,
    });
  } catch (e) {
    next(e);
  }
});
charactersRouter.get("/:id", async (req, res, next) => {
  try {
    const requested = z.string().uuid().parse(req.params.id);
    const {
      rows: [c],
    } = await pool.query(
      `SELECT c.* FROM characters c JOIN games g ON g.id=c.game_id WHERE c.id=coalesce((SELECT character_id FROM character_aliases WHERE old_id=$1),$1::uuid) AND c.is_visible AND c.archived_at IS NULL AND g.is_visible AND g.archived_at IS NULL`,
      [requested],
    );
    if (!c) return res.status(404).json({ error: "Character not found." });
    const skills = await pool.query(
      "SELECT id,name,type,description,icon_url FROM character_skills WHERE character_id=$1 ORDER BY sort_order,id",
      [c.id],
    );
    const recs = await pool.query(
      `SELECT r.*,e.rarity,e.portrait_url,e.kind FROM character_recommendations r LEFT JOIN equipment e ON e.id=r.equipment_id AND e.is_visible AND e.archived_at IS NULL WHERE r.character_id=$1 AND r.is_visible ORDER BY r.category,r.rank,r.item_name`,
      [c.id],
    );
    res.json({
      character: { ...c, skills: skills.rows, recommendations: recs.rows },
      canonicalId: c.id,
    });
  } catch (e) {
    next(e);
  }
});
