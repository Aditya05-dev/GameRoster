import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
export const catalogRouter = Router();
const resources = {
  equipment: "equipment",
  materials: "materials",
  domains: "domains_stages",
  events: "events",
};
catalogRouter.get("/status", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT source_meta,counts,imported_at FROM catalog_imports ORDER BY id DESC LIMIT 1",
    );
    res.json({ latest: rows[0] || null });
  } catch (e) {
    next(e);
  }
});
for (const [path, table] of Object.entries(resources)) {
  catalogRouter.get(`/${path}`, async (req, res, next) => {
    try {
      const q = z
        .object({
          gameId: z.string().uuid().optional(),
          q: z.string().max(100).optional(),
          kind: z.string().max(80).optional(),
          weaponType: z.string().max(60).optional(),
          rarity: z.coerce.number().int().min(1).max(6).optional(),
          day: z
            .enum([
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ])
            .optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(500).default(48),
        })
        .parse(req.query);
      const values = [],
        where = ["t.is_visible", "g.is_visible", "g.archived_at IS NULL"];
      const add = (sql, v) => {
        values.push(v);
        where.push(sql.replace("?", `$${values.length}`));
      };
      if (q.gameId) add("t.game_id=?", q.gameId);
      if (q.q) add("t.name ILIKE ?", `%${q.q}%`);
      if (path === "equipment") {
        where.push("t.archived_at IS NULL");
        if (q.kind) add("t.kind=?", q.kind);
        if (q.weaponType) add("t.stats->>'weaponType'=?", q.weaponType);
      }
      if (q.rarity && ["equipment", "materials"].includes(path))
        add("t.rarity=?", q.rarity);
      if (q.day && path === "domains" && q.day !== "Sunday")
        add(
          "(?=ANY(t.available_days) OR cardinality(t.available_days)=0)",
          q.day,
        );
      const clause = where.join(" AND ");
      const {
        rows: [{ count }],
      } = await pool.query(
        `SELECT count(*) FROM ${table} t JOIN games g ON g.id=t.game_id WHERE ${clause}`,
        values,
      );
      const { rows } = await pool.query(
        `SELECT t.* FROM ${table} t JOIN games g ON g.id=t.game_id WHERE ${clause} ORDER BY t.name LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, q.pageSize, (q.page - 1) * q.pageSize],
      );
      res.json({
        [path]: rows,
        total: Number(count),
        page: q.page,
        pageSize: q.pageSize,
      });
    } catch (e) {
      next(e);
    }
  });
  catalogRouter.get(`/${path}/:id`, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT t.* FROM ${table} t JOIN games g ON g.id=t.game_id WHERE t.id=$1 AND t.is_visible AND g.is_visible AND g.archived_at IS NULL ${path === "equipment" ? "AND t.archived_at IS NULL" : ""}`,
        [z.string().uuid().parse(req.params.id)],
      );
      if (!rows.length)
        return res.status(404).json({ error: "Item not found." });
      res.json({ item: rows[0] });
    } catch (e) {
      next(e);
    }
  });
}
