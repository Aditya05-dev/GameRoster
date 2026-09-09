import { Router } from "express";
import { pool } from "../db/pool.js";

export const catalogRouter = Router();

const RESOURCES = {
  equipment: { table: "equipment", order: "name ASC" },
  materials: { table: "materials", order: "name ASC" },
  domains: { table: "domains_stages", order: "name ASC" },
  events: { table: "events", order: "starts_at DESC NULLS LAST, name ASC" },
};

for (const [path, cfg] of Object.entries(RESOURCES)) {
  catalogRouter.get(`/${path}`, async (req, res, next) => {
    try {
      const { gameId } = req.query;
      const values = [];
      const clauses = [];
      if (gameId) { values.push(gameId); clauses.push(`game_id = $${values.length}`); }
      if (path === "equipment") clauses.push("archived_at IS NULL");
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await pool.query(`SELECT * FROM ${cfg.table} ${where} ORDER BY ${cfg.order} LIMIT 500`, values);
      res.json({ [path]: result.rows });
    } catch (err) { next(err); }
  });
}
