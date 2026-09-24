import { readFileSync } from "node:fs";
const levels = JSON.parse(
  readFileSync(new URL("../data/avatar-levels.json", import.meta.url)),
);
export const maxLevels = [20, 40, 50, 60, 70, 80, 90];
export const minimumLevels = [1, 20, 40, 50, 60, 70, 80];
export function calculateCosts(character, input) {
  const {
    fromLevel,
    toLevel,
    fromAscension,
    toAscension,
    fromTalents,
    toTalents,
  } = input;
  if (
    toLevel < fromLevel ||
    toAscension < fromAscension ||
    toTalents.some((v, i) => v < fromTalents[i])
  )
    throw Object.assign(
      new Error("Targets cannot be below current progress."),
      { status: 422 },
    );
  for (const [level, asc] of [
    [fromLevel, fromAscension],
    [toLevel, toAscension],
  ])
    if (level > maxLevels[asc] || level < minimumLevels[asc])
      throw Object.assign(
        new Error("Level and ascension phase do not match."),
        { status: 422 },
      );
  const talentCaps = [1, 1, 2, 4, 6, 8, 10];
  if (
    fromTalents.some((x) => x > talentCaps[fromAscension]) ||
    toTalents.some((x) => x > talentCaps[toAscension])
  )
    throw Object.assign(
      new Error("Talent level exceeds the selected ascension phase."),
      { status: 422 },
    );
  const items = new Map();
  const add = (item) => {
    const prior = items.get(String(item.id));
    items.set(String(item.id), {
      ...item,
      count: (prior?.count || 0) + item.count,
    });
  };
  for (let phase = fromAscension + 1; phase <= toAscension; phase++) {
    const costs = character.detail.ascension?.[`ascend${phase}`];
    if (!costs)
      throw Object.assign(
        new Error("This character’s ascension costs are not available."),
        { status: 422 },
      );
    costs.forEach(add);
  }
  for (let talent = 0; talent < 3; talent++)
    for (
      let level = fromTalents[talent] + 1;
      level <= toTalents[talent];
      level++
    ) {
      const costs = character.detail.talentCosts?.[`lvl${level}`];
      if (!Array.isArray(costs))
        throw Object.assign(
          new Error(
            "This character’s talent costs are not available for this calculation.",
          ),
          { status: 422 },
        );
      costs.forEach(add);
    }
  let experience = 0;
  for (let level = fromLevel; level < toLevel; level++) {
    const step = levels.find((x) => x.level === level);
    if (!step?.exp) throw new Error("Missing level experience data.");
    experience += step.exp;
  }
  if (experience)
    add({ id: 202, name: "Mora", count: Math.ceil(experience / 5) });
  return {
    items: [...items.values()].sort((a, b) => a.name.localeCompare(b.name)),
    experience,
    herosWitEquivalent: Math.ceil(experience / 20000),
    levelingMora: Math.ceil(experience / 5),
    input,
  };
}
export function serverDay(server = "Asia", now = Date.now()) {
  const offset =
    { Asia: 8, Europe: 1, America: -5, "TW/HK/MO": 8 }[server] ?? 8;
  const shifted = new Date(now + (offset - 4) * 3600000);
  const next =
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() + 1,
    ) -
    (offset - 4) * 3600000;
  return {
    day: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][shifted.getUTCDay()],
    nextReset: new Date(next).toISOString(),
    server,
  };
}
