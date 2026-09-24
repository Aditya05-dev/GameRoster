import "../support/env.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEnka,
  equipmentStat,
  lookupUid,
} from "../../src/services/enka.js";
import { calculateCosts, serverDay } from "../../src/services/ascension.js";
import { catalog } from "../../src/services/catalogImport.js";
const skirk = catalog.characters.find((c) => c.name === "Skirk");
const input = {
  fromLevel: 1,
  toLevel: 90,
  fromAscension: 0,
  toAscension: 6,
  fromTalents: [1, 1, 1],
  toTalents: [1, 1, 1],
};
test("showcase uses final totals, stable avatar IDs, equipment percentages, and talent bonuses", () => {
  const avatars = [10000114, 10000089].map((avatarId) => ({
    avatarId,
    skillDepotId: 1,
    propMap: { 4001: { val: "90" } },
    fightPropMap: {
      1: 100,
      4: 20,
      7: 30,
      2000: 22000,
      2001: 2400,
      2002: 900,
      20: 0.72,
      22: 1.8,
      23: 1.25,
    },
    talentIdList: [1, 2],
    skillLevelMap: { 114: 8 },
    proudSkillExtraLevelMap: { 314: 3 },
    equipList: [
      {
        itemId: 11517,
        weapon: { level: 90, affixMap: { 111517: 0 } },
        flat: {
          nameTextMapHash: 1,
          weaponStats: [
            { appendPropId: "FIGHT_PROP_CRITICAL", statValue: 22.1 },
          ],
          icon: "UI_EquipIcon_Sword_OuterSword",
        },
      },
      {
        itemId: 1,
        reliquary: { level: 21 },
        flat: {
          equipType: "EQUIP_RING",
          reliquaryMainstat: {
            mainPropId: "FIGHT_PROP_ICE_ADD_HURT",
            statValue: 46.6,
          },
          reliquarySubstats: [
            { appendPropId: "FIGHT_PROP_CRITICAL", statValue: 10.5 },
          ],
        },
      },
    ],
  }));
  const r = normalizeEnka(
    { playerInfo: { nickname: "Fixture" }, avatarInfoList: avatars, ttl: 60 },
    "123456789",
    {
      characters: {
        "10000114-1": {
          NameTextMapHash: 2,
          Element: "Ice",
          SkillOrder: [114],
          ProudMap: { 114: 314 },
        },
        "10000089-1": { NameTextMapHash: 3, Element: "Water" },
      },
      localization: { 1: "Azurelight", 2: "Skirk", 3: "Furina" },
    },
  );
  const [c, other] = r.characters;
  assert.equal(c.name, "Skirk");
  assert.equal(other.name, "Furina");
  assert.notEqual(c.image, other.image);
  assert.equal(c.stats.hp.value, 22000);
  assert.equal(c.stats.atk.value, 2400);
  assert.equal(c.stats.def.value, 900);
  assert.equal(c.stats.critRate.value, 72);
  assert.equal(c.stats.energyRecharge.value, 125);
  assert.equal(c.weapon.refinement, 1);
  assert.equal(c.weapon.stats[0].value, 22.1);
  assert.equal(c.artifacts[0].level, 20);
  assert.equal(c.artifacts[0].mainStat.value, 46.6);
  assert.equal(c.talents[0].baseLevel + c.talents[0].bonus, 11);
});
test("missing stats remain unknown and an empty showcase is explicit", () => {
  const r = normalizeEnka(
    { avatarInfoList: [{ avatarId: 999999, propMap: {} }] },
    "123456789",
  );
  assert.equal(r.characters[0].stats.hp.value, null);
  assert.equal(r.characters[0].image, null);
  assert.equal(
    normalizeEnka({ playerInfo: {} }, "123456789").showcaseStatus,
    "empty-or-private",
  );
});
test("provider errors are actionable and concurrent requests obey cache TTL", async () => {
  let calls = 0;
  const fake = async () => {
    calls++;
    return {
      ok: true,
      json: async () => ({ playerInfo: { nickname: "Fixture" }, ttl: 120 }),
    };
  };
  const a = await Promise.all([
    lookupUid("111111111", { fetchImpl: fake }),
    lookupUid("111111111", { fetchImpl: fake }),
  ]);
  assert.equal(calls, 1);
  assert.equal(
    (await lookupUid("111111111", { fetchImpl: fake })).cached,
    true,
  );
  await assert.rejects(
    () =>
      lookupUid("222222222", {
        fetchImpl: async () => ({ ok: false, status: 404 }),
      }),
    (e) => e.status === 404,
  );
});
test("all imported categories use unique native IDs and never borrow mismatched talent names", () => {
  for (const key of ["characters", "equipment", "materials", "domains"]) {
    const ids = catalog[key].map((x) => `${x.kind}:${x.nativeId}`);
    assert.equal(new Set(ids).size, ids.length);
  }
  assert.ok(skirk.detail.skills.some((s) => s.name === "Havoc: Warp"));
});
test("level 1–90 EXP and ascension Mora match the cost data", () => {
  const r = calculateCosts(skirk, input);
  assert.equal(r.experience, 8362650);
  assert.equal(r.herosWitEquivalent, 419);
  assert.equal(r.levelingMora, 1672530);
  assert.equal(r.items.find((x) => x.id === 202).count, 2092530);
});
test("at-cap ascension is counted exactly once and invalid progress is rejected", () => {
  const r = calculateCosts(skirk, {
    ...input,
    fromLevel: 80,
    toLevel: 80,
    fromAscension: 5,
    toAscension: 6,
  });
  assert.equal(r.experience, 0);
  assert.equal(r.items.find((x) => x.id === 202).count, 120000);
  assert.deepEqual(
    calculateCosts(skirk, {
      ...input,
      fromLevel: 80,
      toLevel: 80,
      fromAscension: 6,
      toAscension: 6,
    }).items,
    [],
  );
  assert.throws(
    () => calculateCosts(skirk, { ...input, fromLevel: 90, toLevel: 1 }),
    /Targets/,
  );
  assert.throws(
    () => calculateCosts(skirk, { ...input, toAscension: 5 }),
    /phase/,
  );
});
test("talent costs exclude constellation bonuses and do not double-count completed upgrades", () => {
  const r = calculateCosts(skirk, {
    ...input,
    fromLevel: 90,
    toLevel: 90,
    fromAscension: 6,
    toAscension: 6,
    fromTalents: [1, 8, 8],
    toTalents: [1, 9, 9],
  });
  const expected =
    skirk.detail.talentCosts.lvl9.find((x) => x.id === 202).count * 2;
  assert.equal(r.items.find((x) => x.id === 202).count, expected);
});
test("daily rotation rolls at 04:00 in each fixed server timezone", () => {
  assert.equal(
    serverDay("Asia", Date.parse("2026-09-23T19:59:59Z")).day,
    "Wednesday",
  );
  assert.equal(
    serverDay("Asia", Date.parse("2026-09-23T20:00:00Z")).day,
    "Thursday",
  );
  assert.equal(
    serverDay("America", Date.parse("2026-09-23T08:59:59Z")).day,
    "Tuesday",
  );
  assert.equal(
    serverDay("America", Date.parse("2026-09-23T09:00:00Z")).day,
    "Wednesday",
  );
});
