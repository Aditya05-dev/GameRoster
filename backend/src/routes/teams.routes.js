import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
export const teamsRouter = Router();
const slot = z.object({
  characterId: z.string().uuid(),
  role: z.enum([
    "On-field DPS",
    "Off-field DPS",
    "Support",
    "Healer",
    "Shielder",
    "Flexible",
  ]),
  weaponId: z.string().uuid().nullable().optional(),
  artifactId: z.string().uuid().nullable().optional(),
});
const schema = z.object({
  gameId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).default(""),
  notes: z.string().max(4000).default(""),
  characterIds: z.array(z.string().uuid()).max(12).optional(),
  slots: z.array(slot).max(12).optional(),
  visibility: z.enum(["public", "private"]).default("private"),
});
async function validate(t) {
  const ids = t.slots
    ? t.slots.map((s) => s.characterId)
    : t.characterIds || [];
  const {
    rows: [game],
  } = await pool.query(
    "SELECT entity_schema FROM games WHERE id=$1 AND is_visible AND archived_at IS NULL",
    [t.gameId],
  );
  const max = Math.min(12, Number(game?.entity_schema?.teamSize) || 4);
  if (
    !game ||
    !ids.length ||
    ids.length > max ||
    new Set(ids).size !== ids.length
  )
    throw Object.assign(
      new Error(`Choose 1–${max} different characters from this game.`),
      { status: 422 },
    );
  const { rows } = await pool.query(
    "SELECT id,stats FROM characters WHERE id=ANY($1::uuid[]) AND game_id=$2 AND is_visible AND archived_at IS NULL",
    [ids, t.gameId],
  );
  if (rows.length !== ids.length)
    throw Object.assign(
      new Error("Every character must belong to the selected game."),
      { status: 422 },
    );
  for (const s of t.slots || [])
    for (const [field, kind] of [
      ["weaponId", "weapon"],
      ["artifactId", "artifact_set"],
    ])
      if (s[field]) {
        const {
          rows: [e],
        } = await pool.query(
          "SELECT kind,stats FROM equipment WHERE id=$1 AND game_id=$2 AND is_visible AND archived_at IS NULL",
          [s[field], t.gameId],
        );
        if (
          !e ||
          e.kind !== kind ||
          (kind === "weapon" &&
            e.stats.weaponType !==
              rows.find((c) => c.id === s.characterId).stats.weaponType)
        )
          throw Object.assign(
            new Error("Equipment does not match this character."),
            { status: 422 },
          );
      }
  return ids;
}
teamsRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    const mine = req.query.mine === "true";
    if (mine && !req.user)
      return res.status(401).json({ error: "Sign in to see your teams." });
    const values = mine ? [req.user.id] : [];
    let where = mine ? "t.user_id=$1" : "t.visibility='public'";
    if (req.query.gameId) {
      values.push(z.string().uuid().parse(req.query.gameId));
      where += ` AND t.game_id=$${values.length}`;
    }
    const { rows } = await pool.query(
      `SELECT t.*,u.username AS author_username FROM teams t JOIN users u ON t.user_id=u.id WHERE ${where} ORDER BY t.updated_at DESC LIMIT 100`,
      values,
    );
    res.json({ teams: rows });
  } catch (e) {
    next(e);
  }
});
teamsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const t = schema.parse(req.body);
    const ids = await validate(t);
    const { rows } = await pool.query(
      "INSERT INTO teams(user_id,game_id,name,description,notes,character_ids,slots,visibility) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [
        req.user.id,
        t.gameId,
        t.name,
        t.description,
        t.notes,
        ids,
        JSON.stringify(t.slots || []),
        t.visibility,
      ],
    );
    res.status(201).json({ team: rows[0] });
  } catch (e) {
    next(e);
  }
});
teamsRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const {
      rows: [existing],
    } = await pool.query("SELECT * FROM teams WHERE id=$1", [id]);
    if (!existing) return res.status(404).json({ error: "Team not found." });
    if (existing.user_id !== req.user.id && req.user.role !== "admin")
      return res
        .status(403)
        .json({ error: "This team belongs to another user." });
    const patch = schema.partial().parse(req.body);
    const t = {
      gameId: existing.game_id,
      name: existing.name,
      description: existing.description || "",
      notes: existing.notes || "",
      characterIds: existing.character_ids,
      slots: existing.slots.length ? existing.slots : undefined,
      visibility: existing.visibility,
      ...patch,
    };
    if (patch.characterIds && !patch.slots) t.slots = undefined;
    const ids = await validate(t);
    const { rows } = await pool.query(
      "UPDATE teams SET game_id=$2,name=$3,description=$4,notes=$5,character_ids=$6,slots=$7,visibility=$8,updated_at=now() WHERE id=$1 RETURNING *",
      [
        id,
        t.gameId,
        t.name,
        t.description,
        t.notes,
        ids,
        JSON.stringify(t.slots || []),
        t.visibility,
      ],
    );
    res.json({ team: rows[0] });
  } catch (e) {
    next(e);
  }
});
teamsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM teams WHERE id=$1 AND (user_id=$2 OR $3='admin')",
      [z.string().uuid().parse(req.params.id), req.user.id, req.user.role],
    );
    if (!rowCount) return res.status(404).json({ error: "Team not found." });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
