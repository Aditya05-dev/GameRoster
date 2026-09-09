import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const farmingRouter = Router();

const planSchema = z.object({
  gameId: z.string().uuid(),
  characterId: z.string().uuid(),
  targetUpgrades: z.record(z.any()).optional(),
  materialsNeeded: z.record(z.number()).optional(),
  materialsCollected: z.record(z.number()).optional(),
});

// ---- GET /api/farming-plans ----  (always the caller's own — no cross-user access)
farmingRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT * FROM farming_plans WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json({ plans: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/farming-plans ----
farmingRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const p = planSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO farming_plans (user_id, game_id, character_id, target_upgrades, materials_needed, materials_collected)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, p.gameId, p.characterId, p.targetUpgrades || {}, p.materialsNeeded || {}, p.materialsCollected || {}]
    );
    res.status(201).json({ plan: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- PATCH /api/farming-plans/:id ----  (e.g. update materials_collected as the user farms)
farmingRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await pool.query(`SELECT user_id FROM farming_plans WHERE id = $1`, [req.params.id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: "Plan not found." });
    if (existing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: "You can only edit your own plans." });
    const p = planSchema.partial().parse(req.body);
    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, col] of [["targetUpgrades", "target_upgrades"], ["materialsNeeded", "materials_needed"], ["materialsCollected", "materials_collected"]]) {
      if (p[key] !== undefined) { fields.push(`${col} = $${i++}`); values.push(p[key]); }
    }
    if (!fields.length) return res.status(400).json({ error: "No fields to update." });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE farming_plans SET ${fields.join(", ")}, updated_at = now() WHERE id = $${i} RETURNING *`, values);
    res.json({ plan: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- DELETE /api/farming-plans/:id ----
farmingRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await pool.query(`SELECT user_id FROM farming_plans WHERE id = $1`, [req.params.id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: "Plan not found." });
    if (existing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: "You can only delete your own plans." });
    await pool.query(`DELETE FROM farming_plans WHERE id = $1`, [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
