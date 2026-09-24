import "./support/env.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import request from "supertest";
if (!process.env.TEST_DATABASE_URL)
  throw new Error("Set TEST_DATABASE_URL to an isolated test database.");
const { app } = await import("../src/app.js"),
  { pool } = await import("../src/db/pool.js"),
  { signAccessToken } = await import("../src/utils/jwt.js"),
  { catalog, mergeCharacter } =
    await import("../src/services/catalogImport.js");
let game,
  otherGame,
  characters,
  weapon,
  owner,
  stranger,
  admin,
  mapId,
  markerId;
const headers = (u) => ({ Authorization: `Bearer ${u.token}` });
before(async () => {
  game = (
    await pool.query(
      `INSERT INTO games(slug,name,short_name,entity_schema) VALUES($1,'Fixture','Fixture','{"teamSize":4}') RETURNING id`,
      [`test-companion-${crypto.randomUUID()}`],
    )
  ).rows[0].id;
  otherGame = (
    await pool.query(
      "INSERT INTO games(slug,name,short_name) VALUES($1,'Other','Other') RETURNING id",
      [`test-other-${crypto.randomUUID()}`],
    )
  ).rows[0].id;
  characters = [];
  for (let i = 0; i < 6; i++)
    characters.push(
      (
        await pool.query(
          "INSERT INTO characters(game_id,name,slug,stats,detail) VALUES($1,$2,$3,$4,$5) RETURNING *",
          [
            i === 5 ? otherGame : game,
            `Fixture ${i}`,
            `fixture-${i}`,
            { element: "Cryo", weaponType: "Sword" },
            catalog.characters.find((c) => c.name === "Skirk").detail,
          ],
        )
      ).rows[0],
    );
  weapon = (
    await pool.query(
      "INSERT INTO equipment(game_id,kind,name,rarity,stats) VALUES($1,'weapon','Fixture bow',5,'{\"weaponType\":\"Bow\"}') RETURNING id",
      [game],
    )
  ).rows[0].id;
  const users = [];
  for (const role of ["user", "user", "admin"]) {
    const key = crypto.randomBytes(5).toString("hex");
    const u = (
      await pool.query(
        "INSERT INTO users(user_id_public,username,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [`TEST-${key}`, `test_${key}`, `${key}@example.test`, "unused", role],
      )
    ).rows[0];
    await pool.query("INSERT INTO profiles(user_id) VALUES($1)", [u.id]);
    users.push({ ...u, token: signAccessToken(u) });
  }
  [owner, stranger, admin] = users;
  mapId = (
    await pool.query(
      "INSERT INTO maps(game_id,name) VALUES($1,'Fixture map') RETURNING id",
      [game],
    )
  ).rows[0].id;
  markerId = (
    await pool.query(
      "INSERT INTO map_markers(map_id,label,category,x,y) VALUES($1,'Fixture marker','Test',25,75) RETURNING id",
      [mapId],
    )
  ).rows[0].id;
});
after(async () => {
  await pool.query("DELETE FROM games WHERE id=ANY($1::uuid[])", [
    [game, otherGame],
  ]);
  await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [
    [owner?.id, stranger?.id, admin?.id].filter(Boolean),
  ]);
  await pool.end();
});
test("roster progress is private, persistent and validated", async () => {
  const path = `/api/companion/roster/${characters[0].id}`,
    body = { status: "owned", level: 90, constellation: 2 };
  await request(app).put(path).send(body).expect(401);
  await request(app).put(path).set(headers(owner)).send(body).expect(200);
  assert.equal(
    (
      await request(app)
        .get("/api/companion/roster")
        .set(headers(owner))
        .expect(200)
    ).body.roster[0].constellation,
    2,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/companion/roster")
        .set(headers(stranger))
        .expect(200)
    ).body.roster.length,
    0,
  );
  await request(app)
    .put(path)
    .set(headers(owner))
    .send({ ...body, level: 91 })
    .expect(422);
});
test("teams enforce ownership, slot limit, unique characters, game and equipment compatibility", async () => {
  const base = {
    gameId: game,
    name: "Fixture party",
    slots: characters
      .slice(0, 4)
      .map((c) => ({ characterId: c.id, role: "Support" })),
  };
  const saved = await request(app)
    .post("/api/teams")
    .set(headers(owner))
    .send(base)
    .expect(201);
  await request(app)
    .patch(`/api/teams/${saved.body.team.id}`)
    .set(headers(stranger))
    .send({ name: "Stolen" })
    .expect(403);
  for (const slots of [
    [base.slots[0], base.slots[0]],
    characters.slice(0, 5).map((c) => ({ characterId: c.id, role: "Support" })),
    [{ characterId: characters[5].id, role: "Support" }],
    [{ ...base.slots[0], weaponId: weapon }],
  ])
    await request(app)
      .post("/api/teams")
      .set(headers(owner))
      .send({ ...base, slots })
      .expect(422);
});
test("calculator returns costs and inventory rejects negative quantities and cross-user edits", async () => {
  const r = await request(app)
    .post("/api/companion/calculate")
    .send({
      characterId: characters[0].id,
      fromLevel: 80,
      toLevel: 90,
      fromAscension: 5,
      toAscension: 6,
      fromTalents: [1, 8, 8],
      toTalents: [1, 9, 9],
    })
    .expect(200);
  assert.ok(r.body.items.find((x) => x.id === 202).count > 120000);
  const p = (
    await request(app)
      .post("/api/farming-plans")
      .set(headers(owner))
      .send({
        gameId: game,
        characterId: characters[0].id,
        materialsNeeded: { 202: 1000 },
      })
      .expect(201)
  ).body.plan;
  await request(app)
    .patch(`/api/farming-plans/${p.id}`)
    .set(headers(stranger))
    .send({ materialsCollected: { 202: 100 } })
    .expect(403);
  await request(app)
    .patch(`/api/farming-plans/${p.id}`)
    .set(headers(owner))
    .send({ materialsCollected: { 202: -1 } })
    .expect(422);
});
test("map collections are isolated and a marker must belong to its map", async () => {
  await request(app)
    .put(`/api/maps/${mapId}/collected/${markerId}`)
    .set(headers(owner))
    .send({ collected: true })
    .expect(204);
  assert.deepEqual(
    (await request(app).get(`/api/maps/${mapId}/collected`).set(headers(owner)))
      .body.collected,
    [markerId],
  );
  assert.deepEqual(
    (
      await request(app)
        .get(`/api/maps/${mapId}/collected`)
        .set(headers(stranger))
    ).body.collected,
    [],
  );
  await request(app)
    .put(`/api/maps/${crypto.randomUUID()}/collected/${markerId}`)
    .set(headers(owner))
    .send({ collected: true })
    .expect(404);
});
test("content studio protects writes, hides drafts, publishes entries and records revisions", async () => {
  const body = {
    game_id: game,
    name: "Draft material",
    category: "Test",
    is_visible: false,
  };
  await request(app)
    .post("/api/admin/content/materials")
    .set(headers(owner))
    .send(body)
    .expect(403);
  const item = (
    await request(app)
      .post("/api/admin/content/materials")
      .set(headers(admin))
      .send(body)
      .expect(201)
  ).body.item;
  await request(app).get(`/api/catalog/materials/${item.id}`).expect(404);
  await request(app)
    .patch(`/api/admin/content/materials/${item.id}`)
    .set(headers(admin))
    .send({ is_visible: true })
    .expect(200);
  await request(app).get(`/api/catalog/materials/${item.id}`).expect(200);
  const history = await request(app)
    .get("/api/admin/content/history")
    .set(headers(admin))
    .expect(200);
  assert.ok(history.body.revisions.some((r) => r.entity_id === item.id));
  await request(app)
    .patch(`/api/admin/content/materials/${item.id}`)
    .set(headers(admin))
    .send({ id: crypto.randomUUID() })
    .expect(422);
});
test("legacy merge retains builds, favorites, roster progress, editorial notes and old URLs", async () => {
  const keep = characters[0].id,
    old = characters[4].id;
  await pool.query(
    "UPDATE characters SET strengths=ARRAY['Existing note'] WHERE id=$1",
    [old],
  );
  const build = (
    await pool.query(
      "INSERT INTO builds(user_id,game_id,character_id,title,build_type,snapshot) VALUES($1,$2,$3,'Merged build','dps',$4) RETURNING id",
      [owner.id, game, old, { characterId: old }],
    )
  ).rows[0];
  const team = (
    await pool.query(
      "INSERT INTO teams(user_id,game_id,name,character_ids,slots) VALUES($1,$2,'Merge order',$3,$4) RETURNING id",
      [
        owner.id,
        game,
        [characters[2].id, old, keep, characters[1].id],
        JSON.stringify([
          { characterId: characters[2].id, role: "Lead" },
          { characterId: old, role: "Support" },
          { characterId: keep, role: "Duplicate" },
          { characterId: characters[1].id, role: "Healer" },
        ]),
      ],
    )
  ).rows[0];
  await pool.query(
    "INSERT INTO favorites(user_id,entity_type,entity_id) VALUES($1,'character',$2),($1,'character',$3)",
    [owner.id, old, keep],
  );
  await pool.query(
    "INSERT INTO roster(user_id,character_id,status,level,constellation) VALUES($1,$2,'owned',85,4)",
    [owner.id, old],
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await mergeCharacter(client, old, keep);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  const mergedBuild = (
    await pool.query("SELECT character_id,snapshot FROM builds WHERE id=$1", [
      build.id,
    ])
  ).rows[0];
  assert.equal(mergedBuild.character_id, keep);
  assert.equal(mergedBuild.snapshot.characterId, keep);
  const mergedTeam = (
    await pool.query("SELECT character_ids,slots FROM teams WHERE id=$1", [
      team.id,
    ])
  ).rows[0];
  assert.deepEqual(mergedTeam.character_ids, [
    characters[2].id,
    keep,
    characters[1].id,
  ]);
  assert.deepEqual(
    mergedTeam.slots.map((s) => s.characterId),
    mergedTeam.character_ids,
  );
  assert.equal(mergedTeam.slots[1].role, "Support");
  assert.equal(
    (
      await pool.query(
        "SELECT count(*) FROM favorites WHERE user_id=$1 AND entity_type='character' AND entity_id=$2",
        [owner.id, keep],
      )
    ).rows[0].count,
    "1",
  );
  const r = await request(app).get(`/api/characters/${old}`).expect(200);
  assert.equal(r.body.canonicalId, keep);
  assert.ok(r.body.character.strengths.includes("Existing note"));
  assert.equal(
    (
      await pool.query(
        "SELECT constellation FROM roster WHERE user_id=$1 AND character_id=$2",
        [owner.id, keep],
      )
    ).rows[0].constellation,
    4,
  );
});
test("saved build edits persist and private snapshots are never listed publicly", async () => {
  const b = (
    await request(app)
      .post("/api/builds")
      .set(headers(owner))
      .send({
        gameId: game,
        characterId: characters[1].id,
        title: "Private snapshot",
        buildType: "dps",
        mainStats: { Sands: "ATK%" },
        snapshot: {
          name: "Fixture",
          stats: { hp: { value: 20000, label: "HP", percent: false } },
          uid: "123456789",
        },
      })
      .expect(201)
  ).body.build;
  assert.equal(b.snapshot.uid, undefined);
  await request(app)
    .patch(`/api/builds/${b.id}`)
    .set(headers(owner))
    .send({ mainStats: { Sands: "ER%" } })
    .expect(200);
  assert.equal(
    (
      await request(app)
        .get(`/api/builds?characterId=${characters[1].id}`)
        .expect(200)
    ).body.builds.length,
    0,
  );
  await request(app)
    .patch(`/api/builds/${b.id}`)
    .set(headers(stranger))
    .send({ title: "Stolen" })
    .expect(403);
});

test("edited community guides return to draft for admin review", async () => {
  const g = (
    await request(app)
      .post("/api/guides")
      .set(headers(owner))
      .send({
        gameId: game,
        title: "Review guide",
        body: "A sufficiently detailed guide for review.",
      })
      .expect(201)
  ).body.guide;
  await request(app)
    .patch(`/api/guides/${g.id}`)
    .set(headers(admin))
    .send({ status: "published" })
    .expect(200);
  const edit = await request(app)
    .patch(`/api/guides/${g.id}`)
    .set(headers(owner))
    .send({ title: "Changed after review" })
    .expect(200);
  assert.equal(edit.body.guide.status, "draft");
  await request(app).get(`/api/guides/${g.id}`).expect(403);
});
test("build snapshots reject invalid public render data", async () => {
  await request(app)
    .post("/api/builds")
    .set(headers(owner))
    .send({
      gameId: game,
      characterId: characters[1].id,
      title: "Bad snapshot",
      buildType: "dps",
      snapshot: {
        name: { injected: "object" },
        stats: { hp: { value: "not a number", label: "HP", percent: false } },
      },
    })
    .expect(422);
});
