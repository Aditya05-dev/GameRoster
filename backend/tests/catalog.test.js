import "./support/env.js";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";

if (!process.env.TEST_DATABASE_URL) throw new Error("Set TEST_DATABASE_URL to a migrated, disposable PostgreSQL database.");
const { app } = await import("../src/app.js");
const { pool } = await import("../src/db/pool.js");
let gameId;

test.before(async () => {
  const result = await pool.query("INSERT INTO games (slug, name, short_name) VALUES ($1, 'Test Game', 'Test') RETURNING id", [`test-${randomUUID()}`]);
  gameId = result.rows[0].id;
});
test.after(async () => {
  try { if (gameId) await pool.query("DELETE FROM games WHERE id = $1", [gameId]); }
  finally { await pool.end(); }
});

test("public detail URLs respect the catalog's hidden and archived states", async () => {
  const result = await pool.query("INSERT INTO characters (game_id, name, slug) VALUES ($1, 'Test Character', 'test-character') RETURNING id", [gameId]);
  const id = result.rows[0].id;
  assert.equal((await request(app).get(`/api/characters/${id}`)).status, 200);
  await pool.query("UPDATE characters SET is_visible = false WHERE id = $1", [id]);
  assert.equal((await request(app).get(`/api/characters/${id}`)).status, 404);
  await pool.query("UPDATE characters SET is_visible = true, archived_at = now() WHERE id = $1", [id]);
  assert.equal((await request(app).get(`/api/characters/${id}`)).status, 404);
});
