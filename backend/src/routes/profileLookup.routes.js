import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { lookupUid } from "../services/enka.js";
import { pool } from "../db/pool.js";
export const profileLookupRouter = Router();
profileLookupRouter.use(
  rateLimit({
    windowMs: 60000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many lookups. Please wait a minute." },
  }),
);
const schema = z.object({
  gameSlug: z.literal("genshin-impact"),
  uid: z.string().regex(/^\d{9,10}$/, "UID must contain 9 or 10 digits."),
});
profileLookupRouter.post("/", async (req, res, next) => {
  try {
    const { uid } = schema.parse(req.body);
    const profile = await lookupUid(uid);
    const { rows } = await pool.query(
      `SELECT c.id,c.native_id FROM characters c JOIN games g ON c.game_id=g.id WHERE g.slug='genshin-impact' AND c.is_visible AND c.archived_at IS NULL AND c.native_id=ANY($1::text[])`,
      [profile.characters.map((c) => c.nativeId)],
    );
    const ids = new Map(rows.map((c) => [c.native_id, c.id]));
    res.json({
      ...profile,
      characters: profile.characters.map((c) => ({
        ...c,
        characterId: ids.get(c.nativeId) || null,
      })),
    });
  } catch (e) {
    next(e);
  }
});
