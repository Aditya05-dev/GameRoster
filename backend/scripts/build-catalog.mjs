// Reproducible English-only data snapshot. genshin-db is a build-time dependency.
import db from "genshin-db";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const version = require("genshin-db/package.json").version;
const all = (folder) =>
  db[folder]("names", { matchCategories: true, verboseCategories: true });
const icon = (filename) =>
  filename ? `https://enka.network/ui/${filename}.png` : null;
const clean = (text) =>
  (text || "").replace(/<[^>]*>/g, "").replace(/\*\*/g, "");
const slug = (name) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const meta = {
  provider: "genshin-db",
  packageVersion: version,
  url: "https://github.com/theBowja/genshin-db",
  releaseStatus: "Source version is not a verified release date",
};
const characters = all("characters").map((c) => {
  // Disable fuzzy matching: a missing skill sheet must never borrow another character's talents.
  const t = db.talents(c.name, {
    matchNames: true,
    matchAltNames: false,
    matchAliases: false,
  });
  const talents = t?.name === c.name ? t : null;
  const skills = talents
    ? Object.entries(talents)
        .filter(([k, v]) => /^(combat|passive)/.test(k) && v?.name)
        .map(([key, s], i) => ({
          key,
          name: s.name,
          type: key,
          description: clean(s.description),
          icon: icon(talents.images?.[`filename_${key}`]),
          order: i,
        }))
    : [];
  return {
    nativeId: String(c.id),
    name: c.name,
    slug: slug(c.name),
    rarity: c.rarity,
    version: c.version,
    portrait: c.images?.mihoyo_icon || icon(c.images?.filename_icon),
    artwork: icon(c.images?.filename_gachaSplash),
    stats: {
      element: c.elementText || "Adaptive",
      weaponType: c.weaponText,
      region: c.region || c.affiliation,
      description: clean(c.description),
    },
    detail: {
      title: c.title,
      birthday: c.birthday,
      affiliation: c.affiliation,
      constellation: c.constellation,
      voiceActors: c.cv,
      ascension: c.costs,
      talentCosts: talents?.costs || null,
      baseStats: typeof c.stats === "function" ? c.stats(90) : null,
      gallery: [c.images?.cover1, c.images?.cover2].filter(Boolean),
      skills,
    },
    sourceMeta: { ...meta, version: c.version },
  };
});
const weapons = all("weapons").map((w) => ({
  nativeId: String(w.id),
  kind: "weapon",
  name: w.name,
  rarity: w.rarity,
  portrait: w.images?.mihoyo_icon || icon(w.images?.filename_icon),
  effect: clean(w.r1?.description),
  stats: {
    weaponType: w.weaponText,
    baseAttack: w.stats?.(90)?.attack,
    secondaryStat: w.mainStatText,
    secondaryValue: w.stats?.(90)?.specialized,
    description: clean(w.description),
    refinements: [1, 2, 3, 4, 5].map((i) => clean(w[`r${i}`]?.description)),
    ascension: w.costs,
  },
  sourceMeta: { ...meta, version: w.version },
}));
const artifacts = all("artifacts").map((a) => ({
  nativeId: String(a.id),
  kind: "artifact_set",
  name: a.name,
  rarity: Math.max(...a.rarityList),
  portrait: icon(a.images?.filename_flower),
  effect: [
    a.effect2Pc && `2-piece: ${clean(a.effect2Pc)}`,
    a.effect4Pc && `4-piece: ${clean(a.effect4Pc)}`,
    a.effect1Pc && clean(a.effect1Pc),
  ]
    .filter(Boolean)
    .join("\n"),
  stats: {
    pieces: ["flower", "plume", "sands", "goblet", "circlet"]
      .filter((k) => a[k])
      .map((k) => ({
        slot: k,
        name: a[k].name,
        portrait: icon(a.images?.[`filename_${k}`]),
      })),
  },
  sourceMeta: { ...meta, version: a.version },
}));
const materials = all("materials").map((m) => ({
  nativeId: String(m.id),
  name: m.name,
  category: m.typeText || m.category,
  rarity: m.rarity,
  portrait: icon(m.images?.filename_icon),
  sources: m.sources || [],
  detail: {
    description: clean(m.description),
    days: m.daysOfWeek || [],
    domainId: m.dropDomainId,
    domainName: m.dropDomainName,
  },
  sourceMeta: { ...meta, version: m.version },
}));
const domains = all("domains").map((d) => ({
  nativeId: String(d.id),
  kind: "domain",
  name: d.name,
  location: d.regionName,
  difficulty: String(d.recommendedLevel || ""),
  days: d.daysOfWeek || [],
  drops: d.rewardPreview.map((r) => r.name).join(", "),
  detail: {
    entrance: d.entranceName,
    type: d.domainText,
    rewards: d.rewardPreview,
    recommendedElements: d.recommendedElements,
    disorder: d.disorder,
    description: clean(d.description),
    portrait: icon(d.images?.filename_image),
  },
  sourceMeta: { ...meta, version: d.version },
}));
const data = {
  meta,
  characters,
  equipment: [...weapons, ...artifacts],
  materials,
  domains,
};
for (const key of ["characters", "equipment", "materials", "domains"]) {
  const ids = data[key].map((x) => `${x.kind || ""}:${x.nativeId}`);
  if (new Set(ids).size !== ids.length)
    throw new Error(`Duplicate native IDs in ${key}`);
}
await writeFile(
  new URL("../src/data/genshin.json", import.meta.url),
  JSON.stringify(data),
);
console.log(
  Object.fromEntries(
    ["characters", "equipment", "materials", "domains"].map((k) => [
      k,
      data[k].length,
    ]),
  ),
);
