import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = Router();

// ---- GET /api/notifications ----
notificationsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, type, payload, read_at, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unread = result.rows.filter((n) => !n.read_at).length;
    res.json({ notifications: result.rows, unreadCount: unread });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/notifications/mark-read ----
notificationsRouter.post("/mark-read", requireAuth, async (req, res, next) => {
  try {
    await pool.query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [req.user.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Called internally (see admin.routes.js) when new content is published —
// fans a notification out to every user who opted in, rather than being a
// route a client calls directly.
export async function notifyAllUsers(type, payload, { onlyIfPreference } = {}) {
  const users = await pool.query(
    `SELECT u.id FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.is_active = true ${onlyIfPreference ? `AND p.${onlyIfPreference} = true` : ""}`
  );
  if (users.rowCount === 0) return;
  const values = [];
  const placeholders = users.rows.map((u, idx) => {
    values.push(u.id, type, JSON.stringify(payload));
    const base = idx * 3;
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  });
  await pool.query(`INSERT INTO notifications (user_id, type, payload) VALUES ${placeholders.join(",")}`, values);
}
