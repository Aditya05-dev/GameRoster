import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { pool } from "../db/pool.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generatePublicUserId } from "../utils/publicId.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters.")
  .max(20, "Username must be at most 20 characters.")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores are allowed.");

const signupSchema = z.object({
  username: usernameSchema,
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function persistRefreshToken(userId, refreshToken, userAgent) {
  const decoded = verifyRefreshToken(refreshToken);
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, user_agent, expires_at)
     VALUES ($1, $2, $3, to_timestamp($4))`,
    [userId, tokenHash(refreshToken), userAgent || null, decoded.exp]
  );
}

function setRefreshCookie(res, refreshToken) {
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

// ---- POST /api/auth/signup ----
authRouter.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password } = signupSchema.parse(req.body);

    const reserved = await pool.query("SELECT 1 FROM reserved_usernames WHERE name = lower($1)", [username]);
    if (reserved.rowCount > 0) {
      return res.status(422).json({ error: "That username is reserved." });
    }

    const passwordHash = await hashPassword(password);
    const userIdPublic = generatePublicUserId();

    // The DB's unique index on `username` (CITEXT) is the real source of
    // truth for uniqueness — this catches the race where two signups for
    // the same name land at nearly the same instant. We don't rely on a
    // pre-check; we attempt the insert and translate the resulting
    // unique-violation into a friendly 409 in the error handler... but we
    // give a clearer message here since we know which field caused it.
    let result;
    try {
      result = await pool.query(
        `INSERT INTO users (user_id_public, username, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'user')
         RETURNING id, user_id_public, username, email, role, created_at`,
        [userIdPublic, username, email, passwordHash]
      );
    } catch (err) {
      if (err.code === "23505") {
        const field = err.constraint?.includes("email") ? "email" : "username";
        return res.status(409).json({ error: field === "email" ? "That email is already registered." : `"${username}" is already taken.` });
      }
      throw err;
    }

    const user = result.rows[0];
    await pool.query("INSERT INTO profiles (user_id) VALUES ($1)", [user.id]);

    const accessToken = signAccessToken({ id: user.id, role: user.role, username: user.username });
    const refreshToken = signRefreshToken({ id: user.id });
    await persistRefreshToken(user.id, refreshToken, req.headers["user-agent"]);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({ user: { id: user.id, userIdPublic: user.user_id_public, username: user.username, email: user.email, role: user.role }, accessToken });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/auth/login ----
authRouter.post("/login", async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const result = await pool.query(
      `SELECT id, user_id_public, username, email, password_hash, role, is_active FROM users WHERE username = $1`,
      [username]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: "Invalid username or password." });

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password." });

    const accessToken = signAccessToken({ id: user.id, role: user.role, username: user.username });
    const refreshToken = signRefreshToken({ id: user.id });
    await persistRefreshToken(user.id, refreshToken, req.headers["user-agent"]);
    setRefreshCookie(res, refreshToken);

    res.json({ user: { id: user.id, userIdPublic: user.user_id_public, username: user.username, email: user.email, role: user.role }, accessToken });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/auth/refresh ----
authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: "No refresh token." });

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ error: "Invalid or expired refresh token." });
    }

    const hash = tokenHash(token);
    const session = await pool.query(
      `SELECT id FROM sessions WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > now()`,
      [decoded.sub, hash]
    );
    if (session.rowCount === 0) return res.status(401).json({ error: "Session no longer valid." });

    const userResult = await pool.query(`SELECT id, username, role, is_active FROM users WHERE id = $1`, [decoded.sub]);
    const user = userResult.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: "Account not available." });

    const accessToken = signAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/auth/logout ----
authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      await pool.query(`UPDATE sessions SET revoked_at = now() WHERE token_hash = $1`, [tokenHash(token)]);
    }
    res.clearCookie("refresh_token", { path: "/api/auth" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---- GET /api/auth/me ----
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.user_id_public, u.username, u.email, u.role, u.created_at,
              p.bio, p.avatar_url, p.visibility, p.notify_new_characters, p.favorite_game_id
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "User not found." });
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/auth/change-password ----
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const result = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    const ok = await verifyPassword(currentPassword, result.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect." });
    const newHash = await hashPassword(newPassword);
    await pool.query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [newHash, req.user.id]);
    // Revoke all existing sessions so other devices must re-authenticate.
    await pool.query(`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [req.user.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
