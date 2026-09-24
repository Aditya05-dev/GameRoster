import "./support/env.js";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import request from "supertest";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("Set TEST_DATABASE_URL to a migrated, disposable PostgreSQL database before running integration tests.");
}

const { app } = await import("../src/app.js");
const { pool } = await import("../src/db/pool.js");
const { signAccessToken } = await import("../src/utils/jwt.js");
const createdUsers = [];
const username = () => "test_" + randomBytes(5).toString("hex");
const signup = (name = username()) => request(app).post("/api/auth/signup").send({
  username: name,
  email: name + "_" + randomBytes(4).toString("hex") + "@example.com",
  password: "test-password-123",
});

async function createUser(name) {
  const result = await signup(name);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  createdUsers.push(result.body.user.id);
  return result.body;
}

test.after(async () => {
  try {
    if (createdUsers.length) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [createdUsers]);
  } finally {
    await pool.end();
  }
});

test("signup rejects duplicate usernames, including case changes", async () => {
  const name = username();
  await createUser(name);
  assert.equal((await signup(name)).status, 409);
  assert.equal((await signup(name.toUpperCase())).status, 409);
});

test("signup rejects reserved usernames", async () => {
  assert.equal((await signup("admin")).status, 422);
});

test("concurrent signups for one username have exactly one winner", async () => {
  const name = username();
  const results = await Promise.all([signup(name), signup(name), signup(name)]);
  const successful = results.filter(result => result.status === 201);
  for (const result of successful) createdUsers.push(result.body.user.id);
  assert.equal(successful.length, 1);
  assert.equal(results.filter(result => result.status === 409).length, 2);
});

test("the public user ID survives a valid username change", async () => {
  const { user, accessToken } = await createUser();
  const nextName = username();
  const updated = await request(app).patch("/api/users/me/username")
    .set("Authorization", "Bearer " + accessToken).send({ username: nextName });
  assert.equal(updated.status, 204);
  const me = await request(app).get("/api/auth/me").set("Authorization", "Bearer " + accessToken);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.user_id_public, user.userIdPublic);
  assert.equal(me.body.user.username, nextName);
});

test("admin writes reject ordinary users", async () => {
  const { accessToken } = await createUser();
  const result = await request(app).post("/api/admin/characters")
    .set("Authorization", "Bearer " + accessToken)
    .send({ gameId: "00000000-0000-0000-0000-000000000000", name: "Test", slug: "test" });
  assert.equal(result.status, 403);
});

test("admin routes reject anonymous requests", async () => {
  assert.equal((await request(app).get("/api/admin/users")).status, 401);
});

test("demoted admins cannot retain access through an older token", async () => {
  const { user } = await createUser();
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  const token = signAccessToken({ ...user, role: "admin" });
  assert.equal((await request(app).get("/api/admin/users").set("Authorization", "Bearer " + token)).status, 200);
  await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [user.id]);
  assert.equal((await request(app).get("/api/admin/users").set("Authorization", "Bearer " + token)).status, 403);
});

test("deactivated accounts cannot keep using access tokens", async () => {
  const { user, accessToken } = await createUser();
  await pool.query("UPDATE users SET is_active = false WHERE id = $1", [user.id]);
  assert.equal((await request(app).get("/api/auth/me").set("Authorization", "Bearer " + accessToken)).status, 401);
});
