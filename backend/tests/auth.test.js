// Integration tests against a real (test) Postgres database — run
// `npm run migrate` against a disposable test DB first, then:
//   DATABASE_URL=postgres://...test_db npm test
//
// These intentionally hit the real Express app + real Postgres rather than
// mocking the DB, because the properties under test (DB-enforced username
// uniqueness, race handling) only mean something against the real thing.

import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { pool } from "../src/db/pool.js";

test.after(async () => {
  await pool.end();
});

test("signup rejects a duplicate username", async () => {
  const username = `dup_test_${Date.now()}`;
  const first = await request(app).post("/api/auth/signup").send({
    username, email: `${username}@example.com`, password: "password123",
  });
  assert.equal(first.status, 201);

  const second = await request(app).post("/api/auth/signup").send({
    username, email: `${username}_2@example.com`, password: "password123",
  });
  assert.equal(second.status, 409);
});

test("signup rejects a reserved username", async () => {
  const res = await request(app).post("/api/auth/signup").send({
    username: "admin", email: `admin_${Date.now()}@example.com`, password: "password123",
  });
  assert.equal(res.status, 422);
});

test("simultaneous signups for the same username: exactly one succeeds", async () => {
  const username = `race_test_${Date.now()}`;
  const attempt = () =>
    request(app).post("/api/auth/signup").send({
      username, email: `${username}_${Math.random()}@example.com`, password: "password123",
    });

  const results = await Promise.all([attempt(), attempt(), attempt()]);
  const succeeded = results.filter((r) => r.status === 201);
  const conflicted = results.filter((r) => r.status === 409);
  assert.equal(succeeded.length, 1, "exactly one concurrent signup should win");
  assert.equal(conflicted.length, 2, "the other two should be rejected as duplicates, not silently accepted");
});

test("permanent user ID persists across a username change", async () => {
  const username = `persist_test_${Date.now()}`;
  const signup = await request(app).post("/api/auth/signup").send({
    username, email: `${username}@example.com`, password: "password123",
  });
  const { userIdPublic } = signup.body.user;
  const token = signup.body.accessToken;

  await request(app)
    .patch("/api/users/me/username")
    .set("Authorization", `Bearer ${token}`)
    .send({ username: `${username}_renamed` });

  const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  assert.equal(me.body.user.user_id_public, userIdPublic, "user_id_public must never change");
  assert.equal(me.body.user.username, `${username}_renamed`);
});

test("admin routes reject a non-admin user", async () => {
  const username = `regular_test_${Date.now()}`;
  const signup = await request(app).post("/api/auth/signup").send({
    username, email: `${username}@example.com`, password: "password123",
  });
  const token = signup.body.accessToken;

  const res = await request(app)
    .post("/api/admin/characters")
    .set("Authorization", `Bearer ${token}`)
    .send({ gameId: "00000000-0000-0000-0000-000000000000", name: "Test", slug: "test" });

  assert.equal(res.status, 403, "a regular user must never be able to reach admin write routes");
});

test("admin routes reject requests with no token at all", async () => {
  const res = await request(app).get("/api/admin/users");
  assert.equal(res.status, 401);
});
