import "../support/env.js";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

const { requireAuth, requireAdmin, optionalAuth } = await import("../../src/middleware/auth.js");
const { signAccessToken } = await import("../../src/utils/jwt.js");
const { pool } = await import("../../src/db/pool.js");
const user = { id: "28f8c4c3-2b1a-4d5c-8888-000000000001", username: "test_user", role: "admin" };
const token = signAccessToken(user);
const app = express();
app.get("/admin", requireAuth, requireAdmin, (req, res) => res.json(req.user));
app.get("/public", optionalAuth, (req, res) => res.json({ user: req.user || null }));
app.use((err, req, res, next) => res.status(503).json({ error: "Database unavailable" }));
test.after(() => pool.end());

test("unsigned and missing credentials cannot reach the database or admin handler", async t => {
  const query = t.mock.method(pool, "query", async () => { throw new Error("Unexpected database access"); });
  assert.equal((await request(app).get("/admin")).status, 401);
  assert.equal((await request(app).get("/admin").set("Authorization", "Bearer invalid")).status, 401);
  assert.equal(query.mock.callCount(), 0);
});

test("current database roles override older admin token claims", async t => {
  t.mock.method(pool, "query", async (sql, values) => {
    assert.deepEqual(values, [user.id]);
    return { rowCount: 1, rows: [{ ...user, role: "user" }] };
  });
  assert.equal((await request(app).get("/admin").set("Authorization", `Bearer ${token}`)).status, 403);
});

test("active admins retain access using their current account name", async t => {
  t.mock.method(pool, "query", async () => ({ rowCount: 1, rows: [{ ...user, username: "updated_name" }] }));
  const result = await request(app).get("/admin").set("Authorization", `Bearer ${token}`);
  assert.equal(result.status, 200);
  assert.equal(result.body.username, "updated_name");
});

test("inactive or deleted accounts are rejected on protected routes and anonymous on public routes", async t => {
  t.mock.method(pool, "query", async () => ({ rowCount: 0, rows: [] }));
  assert.equal((await request(app).get("/admin").set("Authorization", `Bearer ${token}`)).status, 401);
  const result = await request(app).get("/public").set("Authorization", `Bearer ${token}`);
  assert.equal(result.status, 200);
  assert.equal(result.body.user, null);
});

test("database failures reach error handling instead of becoming bad-credential errors", async t => {
  t.mock.method(pool, "query", async () => { throw new Error("Connection unavailable"); });
  assert.equal((await request(app).get("/admin").set("Authorization", `Bearer ${token}`)).status, 503);
  assert.equal((await request(app).get("/public").set("Authorization", `Bearer ${token}`)).status, 503);
});
