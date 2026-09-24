import { readFileSync } from "node:fs";
import { catalog } from "./catalogImport.js";
const metadata = JSON.parse(
  readFileSync(new URL("../data/enka-characters.json", import.meta.url)),
);
const locale = JSON.parse(
  readFileSync(new URL("../data/enka-loc.json", import.meta.url)),
);
const characterMap = new Map(catalog.characters.map((c) => [c.nativeId, c]));
export const imageUrl = (name) =>
  /^[A-Za-z0-9_-]{1,160}$/.test(name || "")
    ? `https://enka.network/ui/${name}.png`
    : null;
const number = (value) =>
  value != null && Number.isFinite(Number(value)) ? Number(value) : null;
const translated = (hash, fallback) => locale[String(hash)] || fallback;
const elementNames = {
  Fire: "Pyro",
  Water: "Hydro",
  Electric: "Electro",
  Ice: "Cryo",
  Wind: "Anemo",
  Rock: "Geo",
  Grass: "Dendro",
};
export const statDefinitions = [
  ["hp", "HP", "2000", false],
  ["atk", "ATK", "2001", false],
  ["def", "DEF", "2002", false],
  ["em", "Elemental Mastery", "28", false],
  ["critRate", "CRIT Rate", "20", true],
  ["critDamage", "CRIT DMG", "22", true],
  ["energyRecharge", "Energy Recharge", "23", true],
  ["healing", "Healing Bonus", "26", true],
  ["physical", "Physical DMG Bonus", "30", true],
  ["pyro", "Pyro DMG Bonus", "40", true],
  ["electro", "Electro DMG Bonus", "41", true],
  ["hydro", "Hydro DMG Bonus", "42", true],
  ["dendro", "Dendro DMG Bonus", "43", true],
  ["anemo", "Anemo DMG Bonus", "44", true],
  ["geo", "Geo DMG Bonus", "45", true],
  ["cryo", "Cryo DMG Bonus", "46", true],
];
const propertyLabels = {
  FIGHT_PROP_BASE_ATTACK: "Base ATK",
  FIGHT_PROP_HP: "HP",
  FIGHT_PROP_HP_PERCENT: "HP",
  FIGHT_PROP_ATTACK: "ATK",
  FIGHT_PROP_ATTACK_PERCENT: "ATK",
  FIGHT_PROP_DEFENSE: "DEF",
  FIGHT_PROP_DEFENSE_PERCENT: "DEF",
  FIGHT_PROP_CRITICAL: "CRIT Rate",
  FIGHT_PROP_CRITICAL_HURT: "CRIT DMG",
  FIGHT_PROP_CHARGE_EFFICIENCY: "Energy Recharge",
  FIGHT_PROP_ELEMENT_MASTERY: "Elemental Mastery",
  FIGHT_PROP_HEAL_ADD: "Healing Bonus",
  FIGHT_PROP_PHYSICAL_ADD_HURT: "Physical DMG Bonus",
  FIGHT_PROP_FIRE_ADD_HURT: "Pyro DMG Bonus",
  FIGHT_PROP_WATER_ADD_HURT: "Hydro DMG Bonus",
  FIGHT_PROP_ELEC_ADD_HURT: "Electro DMG Bonus",
  FIGHT_PROP_ICE_ADD_HURT: "Cryo DMG Bonus",
  FIGHT_PROP_WIND_ADD_HURT: "Anemo DMG Bonus",
  FIGHT_PROP_ROCK_ADD_HURT: "Geo DMG Bonus",
  FIGHT_PROP_GRASS_ADD_HURT: "Dendro DMG Bonus",
};
export function equipmentStat(s = {}) {
  const prop = s.mainPropId || s.appendPropId || s.propType;
  // Equipment flat values already contain percentages; do not multiply by 100.
  return {
    key: prop,
    label: propertyLabels[prop] || prop || "Unknown stat",
    value: number(s.statValue ?? s.propValue),
    percent: /PERCENT|CRITICAL|EFFICIENCY|HEAL_ADD|ADD_HURT/.test(prop || ""),
  };
}
export function normalizeEnka(
  data,
  uid,
  { characters = metadata, localization = locale } = {},
) {
  const translate = (hash, fallback) => localization[String(hash)] || fallback;
  const normalized = (data.avatarInfoList || []).map((a) => {
    const nativeId = String(a.avatarId ?? a.avatarID);
    const meta =
      characters[`${nativeId}-${a.skillDepotId}`] || characters[nativeId] || {};
    const c = characterMap.get(nativeId);
    const stats = Object.fromEntries(
      statDefinitions.map(([key, label, id, percent]) => {
        const n = number(a.fightPropMap?.[id]);
        return [
          key,
          {
            label,
            value: n === null ? null : n * (percent ? 100 : 1),
            percent,
          },
        ];
      }),
    );
    const weapon = a.equipList?.find((e) => e.weapon);
    const artifacts = (a.equipList || [])
      .filter((e) => e.reliquary)
      .map((e) => ({
        itemId: e.itemId,
        name: translate(
          e.flat?.nameTextMapHash ?? e.flat?.nameTextHashMap,
          `Artifact ${e.itemId}`,
        ),
        setName: translate(
          e.flat?.setNameTextMapHash ?? e.flat?.setNameTextHashMap,
          "Unknown set",
        ),
        rarity: e.flat?.rankLevel,
        slot: e.flat?.equipType,
        level:
          number(e.reliquary.level) === null ? null : e.reliquary.level - 1,
        image: imageUrl(e.flat?.icon),
        mainStat: equipmentStat(e.flat?.reliquaryMainstat),
        substats: (e.flat?.reliquarySubstats || []).map(equipmentStat),
      }));
    return {
      key: `${nativeId}-${a.skillDepotId || 0}`,
      nativeId,
      skillDepotId: a.skillDepotId,
      name: translate(meta.NameTextMapHash, c?.name || `Character ${nativeId}`),
      element: elementNames[meta.Element] || c?.stats.element || "Unknown",
      image: c?.portrait || imageUrl(meta.SideIconName),
      artwork: c?.artwork || null,
      level: number(a.propMap?.["4001"]?.val),
      ascension: number(a.propMap?.["1002"]?.val),
      constellation: Array.isArray(a.talentIdList) ? a.talentIdList.length : 0,
      friendship: number(a.fetterInfo?.expLevel),
      stats,
      talents: (meta.SkillOrder || Object.keys(a.skillLevelMap || {})).map(
        (id) => ({
          id,
          baseLevel: number(a.skillLevelMap?.[id]),
          bonus: number(a.proudSkillExtraLevelMap?.[meta.ProudMap?.[id]]) || 0,
          image: imageUrl(meta.Skills?.[id]),
        }),
      ),
      weapon: weapon
        ? {
            itemId: weapon.itemId,
            name: translate(
              weapon.flat?.nameTextMapHash ?? weapon.flat?.nameTextHashMap,
              `Weapon ${weapon.itemId}`,
            ),
            image: imageUrl(weapon.flat?.icon),
            rarity: weapon.flat?.rankLevel,
            level: number(weapon.weapon.level),
            refinement: Object.values(weapon.weapon.affixMap || {}).length
              ? Number(Object.values(weapon.weapon.affixMap)[0]) + 1
              : null,
            stats: (weapon.flat?.weaponStats || []).map(equipmentStat),
          }
        : null,
      artifacts,
    };
  });
  return {
    uid,
    provider: "Enka.Network",
    fetchedAt: new Date().toISOString(),
    ttl: Math.max(1, number(data.ttl) || 60),
    player: {
      nickname: data.playerInfo?.nickname || "Traveler",
      level: number(data.playerInfo?.level),
      worldLevel: number(data.playerInfo?.worldLevel),
      signature: data.playerInfo?.signature || "",
      achievements: number(data.playerInfo?.finishAchievementNum),
    },
    characters: normalized,
    showcaseStatus: normalized.length ? "available" : "empty-or-private",
  };
}
const cache = new Map(),
  pending = new Map();
export async function lookupUid(
  uid,
  { fetchImpl = fetch, now = () => Date.now() } = {},
) {
  const hit = cache.get(uid);
  if (hit && hit.expires > now()) return { ...hit.data, cached: true };
  if (pending.has(uid)) return pending.get(uid);
  const task = (async () => {
    const response = await fetchImpl(`https://enka.network/api/uid/${uid}/`, {
      headers: {
        "User-Agent": "GameRoster/3.0 (public showcase companion)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const errors = {
        400: [422, "Enter a valid Genshin UID."],
        404: [404, "Player not found. Check the UID."],
        424: [503, "Enka is under maintenance. Try again later."],
        429: [429, "The provider is rate limiting lookups. Please wait."],
      };
      const [status, message] = errors[response.status] || [
        502,
        "The profile provider is unavailable. Try again later.",
      ];
      throw Object.assign(new Error(message), { status });
    }
    const data = normalizeEnka(await response.json(), uid);
    if (cache.size >= 250) cache.delete(cache.keys().next().value);
    cache.set(uid, { data, expires: now() + data.ttl * 1000 });
    return { ...data, cached: false };
  })();
  pending.set(uid, task);
  try {
    return await task;
  } catch (e) {
    if (e.name === "TimeoutError" || e.name === "AbortError")
      throw Object.assign(
        new Error("The profile provider timed out. Please retry."),
        { status: 504 },
      );
    throw e;
  } finally {
    pending.delete(uid);
  }
}
