import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { calculateCosts, serverDay } from "../services/ascension.js";
export const companionRouter = Router();
const uuid = z.string().uuid();
export const upgradeSchema = z.object({
  fromLevel: z.number().int().min(1).max(90),
  toLevel: z.number().int().min(1).max(90),
  fromAscension: z.number().int().min(0).max(6),
  toAscension: z.number().int().min(0).max(6),
  fromTalents: z.array(z.number().int().min(1).max(10)).length(3),
  toTalents: z.array(z.number().int().min(1).max(10)).length(3),
});
companionRouter.get("/schedule", async (req, res, next) => {
  try {
    const server = z
      .enum(["Asia", "Europe", "America", "TW/HK/MO"])
      .default("Asia")
      .parse(req.query.server);
    const day = serverDay(server);
    const { rows } = await pool.query(
      `SELECT d.* FROM domains_stages d JOIN games g ON g.id=d.game_id WHERE g.slug='genshin-impact' AND d.is_visible AND ($1='Sunday' OR $1=ANY(d.available_days) OR cardinality(d.available_days)=0) ORDER BY d.location,d.name`,
      [day.day],
    );
    res.json({ ...day, domains: rows });
  } catch (e) {
    next(e);
  }
});
companionRouter.post("/calculate", async (req, res, next) => {
  try {
    const { characterId, ...input } = z
      .object({ characterId: uuid })
      .merge(upgradeSchema)
      .parse(req.body);
    const {
      rows: [character],
    } = await pool.query(
      "SELECT * FROM characters WHERE id=$1 AND is_visible AND archived_at IS NULL",
      [characterId],
    );
    if (!character)
      return res.status(404).json({ error: "Character not found." });
    const result = calculateCosts(character, input);
    const { rows } = await pool.query(
      "SELECT native_id,portrait_url,source_locations,detail FROM materials WHERE game_id=$1 AND native_id=ANY($2::text[]) AND is_visible",
      [character.game_id, result.items.map((x) => String(x.id))],
    );
    const byId = new Map(rows.map((x) => [x.native_id, x]));
    res.json({
      ...result,
      gameId: character.game_id,
      characterId,
      items: result.items.map((x) => ({ ...x, ...byId.get(String(x.id)) })),
    });
  } catch (e) {
    next(e);
  }
});
companionRouter.get("/roster", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*,c.name,c.portrait_url,c.stats,c.rarity,c.game_id FROM roster r JOIN characters c ON c.id=r.character_id WHERE r.user_id=$1 ORDER BY c.name`,
      [req.user.id],
    );
    res.json({ roster: rows });
  } catch (e) {
    next(e);
  }
});
companionRouter.put("/roster/:id", requireAuth, async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const data = z
      .object({
        status: z.enum(["owned", "wishlist"]),
        level: z.number().int().min(1).max(90),
        constellation: z.number().int().min(0).max(6),
      })
      .parse(req.body);
    const { rows } = await pool.query(
      `INSERT INTO roster(user_id,character_id,status,level,constellation) SELECT $1,id,$3,$4,$5 FROM characters WHERE id=$2 AND is_visible AND archived_at IS NULL ON CONFLICT(user_id,character_id) DO UPDATE SET status=$3,level=$4,constellation=$5,updated_at=now() RETURNING *`,
      [req.user.id, id, data.status, data.level, data.constellation],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Character not found." });
    res.json({ entry: rows[0] });
  } catch (e) {
    next(e);
  }
});
companionRouter.delete("/roster/:id", requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      "DELETE FROM roster WHERE user_id=$1 AND character_id=$2",
      [req.user.id, uuid.parse(req.params.id)],
    );
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
