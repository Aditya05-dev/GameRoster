import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

export const usersRouter = Router();

// ---- GET /api/users/search?q= ----
// Searches both username and permanent User ID; User IDs stay valid across
// username changes, so this is the reliable way to find someone long-term.
usersRouter.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ results: [] });
    const result = await pool.query(
      `SELECT u.id, u.user_id_public, u.username, p.avatar_url, p.visibility
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE (u.username ILIKE $1 OR u.user_id_public ILIKE $1) AND u.is_active = true
       ORDER BY u.username ASC
       LIMIT 20`,
      [`%${q}%`]
    );
    res.json({
      results: result.rows
        .filter((r) => r.visibility !== "private")
        .map((r) => ({ id: r.id, userIdPublic: r.user_id_public, username: r.username, avatarUrl: r.avatar_url })),
    });
  } catch (err) {
    next(err);
  }
});

// ---- GET /api/users/:username ----  (public profile)
usersRouter.get("/:username", optionalAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.user_id_public, u.username, u.created_at, u.role,
              p.bio, p.avatar_url, p.visibility, p.favorite_game_id
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.username = $1 AND u.is_active = true`,
      [req.params.username]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "User not found." });
    const profile = result.rows[0];
    const isOwner = req.user?.id === profile.id;
    if (profile.visibility === "private" && !isOwner && req.user?.role !== "admin") {
      return res.status(403).json({ error: "This profile is private." });
    }

    const [builds, teams] = await Promise.all([
      pool.query(`SELECT id, title, build_type, character_id, game_id FROM builds WHERE user_id = $1 AND visibility = 'public'`, [profile.id]),
      pool.query(`SELECT id, name, character_ids, game_id FROM teams WHERE user_id = $1 AND visibility = 'public'`, [profile.id]),
    ]);

    res.json({
      user: {
        userIdPublic: profile.user_id_public,
        username: profile.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        role: profile.role,
        memberSince: profile.created_at,
      },
      publicBuilds: builds.rows,
      publicTeams: teams.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ---- PATCH /api/users/me/profile ----
const profileSchema = z.object({
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  visibility: z.enum(["public", "private"]).optional(),
  notifyNewCharacters: z.boolean().optional(),
  favoriteGameId: z.string().uuid().nullable().optional(),
});
usersRouter.patch("/me/profile", requireAuth, async (req, res, next) => {
  try {
    const patch = profileSchema.parse(req.body);
    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, col] of [
      ["bio", "bio"], ["avatarUrl", "avatar_url"], ["visibility", "visibility"],
      ["notifyNewCharacters", "notify_new_characters"], ["favoriteGameId", "favorite_game_id"],
    ]) {
      if (patch[key] !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(patch[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update." });
    values.push(req.user.id);
    await pool.query(`UPDATE profiles SET ${fields.join(", ")}, updated_at = now() WHERE user_id = $${i}`, values);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---- PATCH /api/users/me/username ----
const usernameChangeSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
});
usersRouter.patch("/me/username", requireAuth, async (req, res, next) => {
  try {
    const { username } = usernameChangeSchema.parse(req.body);
    const reserved = await pool.query("SELECT 1 FROM reserved_usernames WHERE name = lower($1)", [username]);
    if (reserved.rowCount > 0) return res.status(422).json({ error: "That username is reserved." });
    try {
      await pool.query(`UPDATE users SET username = $1, updated_at = now() WHERE id = $2`, [username, req.user.id]);
    } catch (err) {
      if (err.code === "23505") return res.status(409).json({ error: `"${username}" is already taken.` });
      throw err;
    }
    // Note: the permanent user_id_public is untouched — it never changes.
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---- DELETE /api/users/me ----  (deactivate, not hard-delete — preserves referential integrity of public content)
usersRouter.delete("/me", requireAuth, async (req, res, next) => {
  try {
    await pool.query(`UPDATE users SET is_active = false, updated_at = now() WHERE id = $1`, [req.user.id]);
    await pool.query(`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [req.user.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
