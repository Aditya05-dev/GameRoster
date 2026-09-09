import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   DESIGN TOKENS
   Base: graphite/ink neutrals, not pure black or cream-default.
   Each game gets its own accent; the platform shell uses a
   quiet steel-cyan so game pages feel distinct from the chrome.
   Display type: condensed grotesque (HUD/roster feel).
   Body type: humanist sans, generous line-height for reading.
============================================================ */
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');`;

const T = {
  bg: "#14161C",
  bgRaised: "#1B1E27",
  card: "#1F222C",
  border: "#2B2F3A",
  borderSoft: "#242732",
  text: "#EDEDF1",
  textMuted: "#9A9DAA",
  textFaint: "#6B6E7A",
  shell: "#6FA8C7",
  danger: "#E2685F",
  good: "#6FBF8B",
};

const GAMES = [
  { id: "genshin-impact", name: "Genshin Impact", short: "Genshin", franchise: "HoYoverse", accent: "#E3B567", initial: "GI", implemented: true },
  { id: "honkai-star-rail", name: "Honkai: Star Rail", short: "Star Rail", franchise: "HoYoverse", accent: "#9B7EDE", initial: "SR", implemented: true },
  { id: "zenless-zone-zero", name: "Zenless Zone Zero", short: "ZZZ", franchise: "HoYoverse", accent: "#FF3B7D", initial: "ZZ", implemented: true },
  { id: "wuthering-waves", name: "Wuthering Waves", short: "Wuwa", franchise: null, accent: "#4FD1C5", initial: "WW", implemented: true },
  { id: "arknights", name: "Arknights", short: "Arknights", franchise: null, accent: "#F2994A", initial: "AK", implemented: true },
  { id: "neverness-to-everness", name: "Neverness to Everness", short: "Neverness", franchise: null, accent: "#7FA8FF", initial: "NE", implemented: true },
];
// Honkai Impact 3rd and Tears of Themis are intentionally absent above and
// must never be added to this array, per the platform's content rules.

// Per-game field labels & mechanics config. Each game reuses the same
// generic character shape (element/weaponType/role/region + rarity/tier)
// but labels those slots according to its own vocabulary — this is the
// demo-side expression of the entity_schema JSONB config in SCHEMA.md,
// which is how a real backend keeps this content-driven per game.
const GAME_CONFIG = {
  "genshin-impact": { l1: "Element", l2: "Weapon", l3: "Role", l4: "Region", domainWord: "Domains", teamSize: 4, currency: "Resin" },
  "honkai-star-rail": { l1: "Path", l2: "Combat Type", l3: "Role", l4: "Faction", domainWord: "Calibration Battles", teamSize: 4, currency: "Trailblaze Power" },
  "zenless-zone-zero": { l1: "Attribute", l2: "Specialty", l3: "Role", l4: "Faction", domainWord: "Hollow Zero Nodes", teamSize: 3, currency: "Battery Charge" },
  "wuthering-waves": { l1: "Attribute", l2: "Weapon", l3: "Role", l4: "Faction", domainWord: "Farming Zones", teamSize: 4, currency: "Waveplate" },
  "arknights": { l1: "Class", l2: "Subclass", l3: "Archetype", l4: "Faction", domainWord: "Stages", teamSize: 6, currency: "Sanity" },
  "neverness-to-everness": { l1: "Esper Type", l2: "Archetype", l3: "Combat Role", l4: "Affiliation", domainWord: "Anomaly Investigations", teamSize: 4, currency: "Stamina" },
};

const RESERVED_USERNAMES = ["admin", "administrator", "support", "system", "moderator", "official"];

const SEED_CHARACTERS = [
  { id: "c-xiangling", gameId: "genshin-impact", name: "Xiangling", rarity: 4, element: "Pyro", weaponType: "Polearm", role: "Sub-DPS", region: "Liyue", releaseVersion: "1.0",
    strengths: ["Off-field Pyro application", "Cheap to build", "Works in almost any team"],
    weaknesses: ["Burst is skill-point hungry", "Low personal survivability"],
    gameplayNotes: "Summon Guoba then burst for a wide AoE Pyro field; rotate off-field.",
    skills: [{ name: "Guoba Attack", type: "Elemental Skill", desc: "Summons a fire turret." }, { name: "Pyronado", type: "Elemental Burst", desc: "Whirling polearm dealing continuous Pyro DMG." }],
    tier: "S" },
  { id: "c-bennett", gameId: "genshin-impact", name: "Bennett", rarity: 4, element: "Pyro", weaponType: "Sword", role: "Support/Healer", region: "Mondstadt", releaseVersion: "1.0",
    strengths: ["Team-wide heal + ATK buff field", "Cheap, universal support"],
    weaknesses: ["Field can trigger unwanted Pyro reactions"],
    gameplayNotes: "Burst on-field for the ATK buff circle, then swap DPS in.",
    skills: [{ name: "Passion Overload", type: "Elemental Skill", desc: "Pyro damage + brief buff." }, { name: "Fantastic Voyage", type: "Elemental Burst", desc: "Healing + ATK buff field." }],
    tier: "S" },
  { id: "c-xingqiu", gameId: "genshin-impact", name: "Xingqiu", rarity: 4, element: "Hydro", weaponType: "Sword", role: "Sub-DPS/Support", region: "Liyue", releaseVersion: "1.0",
    strengths: ["Off-field Hydro application", "Damage reduction from Rain Sword"],
    weaknesses: ["Wants Energy Recharge investment"],
    gameplayNotes: "Skill for the Rain Sword shield-lite, burst for repeated Hydro procs.",
    skills: [{ name: "Rain Sword", type: "Elemental Skill", desc: "Damage reduction + Hydro slashes." }, { name: "Guhua Sword: Raincutter", type: "Elemental Burst", desc: "Repeated Hydro sword rain." }],
    tier: "S" },
  { id: "c-ningguang", gameId: "genshin-impact", name: "Ningguang", rarity: 4, element: "Geo", weaponType: "Catalyst", role: "Sub-DPS", region: "Liyue", releaseVersion: "1.0",
    strengths: ["High single-hit burst damage", "Geo Construct synergy"],
    weaknesses: ["Clunky animation lock on skill"],
    gameplayNotes: "Skill for a Jade Screen construct, burst for a heavy single hit.",
    skills: [{ name: "Jade Screen", type: "Elemental Skill", desc: "Raises a Geo wall / attack platform." }, { name: "Starshatter", type: "Elemental Burst", desc: "Large single-target Geo nuke." }],
    tier: "A" },
  { id: "c-kaeya", gameId: "genshin-impact", name: "Kaeya", rarity: 4, element: "Cryo", weaponType: "Sword", role: "Sub-DPS", region: "Mondstadt", releaseVersion: "1.0",
    strengths: ["Cheap Cryo application", "Good early-game carry"],
    weaknesses: ["Outclassed by other Cryo supports late-game"],
    gameplayNotes: "Skill for AoE Cryo application, burst for a wide slash.",
    skills: [{ name: "Frostgnaw", type: "Elemental Skill", desc: "AoE Cryo damage." }, { name: "Glacial Waltz", type: "Elemental Burst", desc: "Cryo blade wave." }],
    tier: "B" },
  { id: "c-diluc", gameId: "genshin-impact", name: "Diluc", rarity: 5, element: "Pyro", weaponType: "Claymore", role: "Main DPS", region: "Mondstadt", releaseVersion: "1.0",
    strengths: ["High base ATK", "Simple, strong on-field DPS"],
    weaknesses: ["No native mobility or utility"],
    gameplayNotes: "Skill into infusion window, weave normal attacks, burst as a nuke.",
    skills: [{ name: "Searing Onslaught", type: "Elemental Skill", desc: "Pyro infusion + combo attacks." }, { name: "Dawn", type: "Elemental Burst", desc: "Explosive Pyro nova." }],
    tier: "S" },

  // ---- Honkai: Star Rail ---- (element=Path, weaponType=Combat Type, region=Faction)
  { id: "c-march7th", gameId: "honkai-star-rail", name: "March 7th", rarity: 4, element: "Preservation", weaponType: "Ice", role: "Shielder", region: "Astral Express", releaseVersion: "1.0",
    strengths: ["Strong shield uptime", "Easy to build, forgiving stats"],
    weaknesses: ["Little offensive contribution"],
    gameplayNotes: "Skill on your squishiest ally, ult when the shield is about to fall off.",
    skills: [{ name: "Ice, Ice, Baby!", type: "Skill", desc: "Shields a single ally." }, { name: "Glacial Cascade", type: "Ultimate", desc: "AoE Ice damage + freeze chance." }],
    tier: "A" },
  { id: "c-tingyun", gameId: "honkai-star-rail", name: "Tingyun", rarity: 4, element: "Harmony", weaponType: "Lightning", role: "Buffer", region: "Xianzhou Luofu", releaseVersion: "1.1",
    strengths: ["Huge single-target ATK buff", "Energy regen support"],
    weaknesses: ["Buff is single-target only"],
    gameplayNotes: "Skill your main DPS every turn for the ATK% buff and bonus damage transfer.",
    skills: [{ name: "Benediction", type: "Skill", desc: "ATK buff + damage share on one ally." }, { name: "Rowdy Rendition", type: "Ultimate", desc: "Team energy regen." }],
    tier: "S" },
  { id: "c-natasha", gameId: "honkai-star-rail", name: "Natasha", rarity: 4, element: "Abundance", weaponType: "Physical", role: "Healer", region: "Belobog", releaseVersion: "1.0",
    strengths: ["Reliable single-target heal", "Cleanse on ultimate"],
    weaknesses: ["Lower healing ceiling than 5-star healers"],
    gameplayNotes: "Skill your lowest-HP ally; save ult for a cleanse when debuffed.",
    skills: [{ name: "Curing Talisman", type: "Skill", desc: "Single-target heal over time." }, { name: "Miracle Cure", type: "Ultimate", desc: "Team heal + status cleanse." }],
    tier: "B" },
  { id: "c-danheng", gameId: "honkai-star-rail", name: "Dan Heng", rarity: 4, element: "Hunt", weaponType: "Wind", role: "Single-target DPS", region: "Astral Express", releaseVersion: "1.0",
    strengths: ["Strong single-target Wind DPS", "Cheap early carry"],
    weaknesses: ["Outshone by his own limited alt"],
    gameplayNotes: "Skill to build toward ult, ult to enter enhanced state for a burst window.",
    skills: [{ name: "Lingering Shadow", type: "Skill", desc: "Single-target Wind damage." }, { name: "Vibrato of Longing", type: "Ultimate", desc: "Enhanced-state single-target nuke." }],
    tier: "A" },
];

const SEED_ZZZ_CHARACTERS = [
  // element=Attribute, weaponType=Specialty, region=Faction
  { id: "c-anby", gameId: "zenless-zone-zero", name: "Anby Demara", rarity: 4, element: "Electric", weaponType: "Stun", role: "Stun/Support", region: "Cunning Hares", releaseVersion: "1.0",
    strengths: ["Fast stun buildup", "Simple starter kit"],
    weaknesses: ["Low raw damage output"],
    gameplayNotes: "Dodge-counter into EX special to stack Electric attribute buildup, swap out once the target's stunned.",
    skills: [{ name: "Lightning Strikes", type: "Basic Attack", desc: "Fast Electric attribute combo." }, { name: "Overload!", type: "Ultimate", desc: "Big single-target Electric burst on a stunned enemy." }],
    tier: "B" },
  { id: "c-nicole", gameId: "zenless-zone-zero", name: "Nicole Demara", rarity: 4, element: "Ether", weaponType: "Support", role: "Support/DPS", region: "Cunning Hares", releaseVersion: "1.0",
    strengths: ["Team-wide DEF shred", "Off-field Ether application"],
    weaknesses: ["Squishy if forced on-field"],
    gameplayNotes: "EX special for DEF shred uptime, swap cancel back to your DPS immediately.",
    skills: [{ name: "Boogie Bear", type: "EX Special", desc: "Summons a bear that shreds DEF." }, { name: "Party Popper", type: "Ultimate", desc: "AoE Ether damage." }],
    tier: "A" },
  { id: "c-corin", gameId: "zenless-zone-zero", name: "Corin Wickes", rarity: 4, element: "Physical", weaponType: "Attack", role: "Main DPS", region: "Victoria Housekeeping", releaseVersion: "1.0",
    strengths: ["High mobility Physical DPS", "Strong single-target damage"],
    weaknesses: ["Chainsaw meter management takes practice"],
    gameplayNotes: "Build chainsaw meter with basics, dump it in EX specials during a stun window.",
    skills: [{ name: "Trimming", type: "Basic Attack", desc: "Chainsaw combo builds meter." }, { name: "Absolute Purge", type: "Ultimate", desc: "High Physical damage nuke." }],
    tier: "A" },
];

// ---- Wuthering Waves ---- (element=Attribute, weaponType=Weapon, region=Faction)
const SEED_WUWA_CHARACTERS = [
  { id: "c-jiyan", gameId: "wuthering-waves", name: "Jiyan", rarity: 5, element: "Aero", weaponType: "Broadblade", role: "Main DPS", region: "Jinzhou", releaseVersion: "1.0",
    strengths: ["Huge AoE burst via Windqueller", "Strong single-target and add-clear"],
    weaknesses: ["Resonance skill has a long windup"],
    gameplayNotes: "Stack Qingloong intensity with skill/basics, unleash Windqueller for the AoE nuke.",
    skills: [{ name: "Wind of Vitality", type: "Resonance Skill", desc: "Grants a shield and Qingloong Mode." }, { name: "Windqueller", type: "Resonance Liberation", desc: "Massive AoE Aero damage." }],
    tier: "S" },
  { id: "c-yinlin", gameId: "wuthering-waves", name: "Yinlin", rarity: 5, element: "Electro", weaponType: "Rectifier", role: "Sub-DPS", region: "Rinascita", releaseVersion: "1.2",
    strengths: ["Off-field Electro application", "Very click-light rotation"],
    weaknesses: ["Wants concerto energy support to shine"],
    gameplayNotes: "Skill then swap out; puppet keeps attacking off-field for continued Electro damage.",
    skills: [{ name: "Descension", type: "Resonance Skill", desc: "Summons a marionette that attacks off-field." }, { name: "Net of Retribution", type: "Resonance Liberation", desc: "AoE Electro burst." }],
    tier: "S" },
  { id: "c-mortefi", gameId: "wuthering-waves", name: "Mortefi", rarity: 4, element: "Fusion", weaponType: "Rectifier", role: "Sub-DPS", region: "Jinzhou", releaseVersion: "1.0",
    strengths: ["Fast off-field Fusion application", "Cheap and easy to build"],
    weaknesses: ["Low personal survivability if forced on-field"],
    gameplayNotes: "Skill for a quick off-field burst, weave between main DPS rotations.",
    skills: [{ name: "Molten Rift", type: "Resonance Skill", desc: "Fusion damage over a short window." }, { name: "Gauge of Extremity", type: "Resonance Liberation", desc: "Fusion nova." }],
    tier: "A" },
];

// ---- Arknights ---- (element=Class, weaponType=Subclass, role=Archetype, region=Faction)
const SEED_ARKNIGHTS_CHARACTERS = [
  { id: "c-texas", gameId: "arknights", name: "Texas", rarity: 5, element: "Vanguard", weaponType: "Charger", role: "DP-recovery/CC", region: "Penguin Logistics", releaseVersion: "Global Launch",
    strengths: ["Instant DP recovery on deployment", "Stun on skill for crowd control"],
    weaknesses: ["Fragile if left on the front line"],
    gameplayNotes: "Deploy early for the DP refund, use skill to stun a chokepoint enemy, retreat if focused.",
    skills: [{ name: "Wdeveloped Wolf", type: "Skill", desc: "Stuns enemies in melee range." }],
    tier: "A" },
  { id: "c-exusiai", gameId: "arknights", name: "Exusiai", rarity: 6, element: "Sniper", weaponType: "Fast-Redeploy", role: "AoE/DPS", region: "Rhine Lab", releaseVersion: "Global Launch",
    strengths: ["Extremely high attack speed", "Cheap redeploy cost"],
    weaknesses: ["Physical damage falls off vs high-DEF targets"],
    gameplayNotes: "Place on a tile hitting the most enemies; her S2 line-clear talent shines vs swarms.",
    skills: [{ name: "Fastest Gun Ever", type: "Talent", desc: "Bonus damage vs low-HP or multiple targets." }],
    tier: "S" },
  { id: "c-hoshiguma", gameId: "arknights", name: "Hoshiguma", rarity: 5, element: "Defender", weaponType: "Guardian", role: "Tank/AoE-block", region: "Rhodes Island", releaseVersion: "Global Launch",
    strengths: ["Blocks 3 enemies with strong AoE damage", "High DEF for chokepoint holding"],
    weaknesses: ["Skill 2 drains her own HP over time"],
    gameplayNotes: "Hold a 3-wide chokepoint; pair with a healer when running her HP-draining skill.",
    skills: [{ name: "Iron Will", type: "Skill", desc: "Boosts DEF and blocks more enemies." }],
    tier: "A" },
];

// ---- Neverness to Everness ---- (element=Esper Type, weaponType=Archetype, role=Combat Role, region=Affiliation)
// Character facts (rank, esper type, archetype, combat role, affiliation) sourced from
// published launch-roster guides; skill descriptions are kept at the general combat-role
// level rather than inventing specific unverified ability names.
const SEED_NTE_CHARACTERS = [
  { id: "c-edgar", gameId: "neverness-to-everness", name: "Edgar", rarity: 4, rarityText: "A-Class", element: "Cosmos", weaponType: "Liquid", role: "Survival + Healing", region: "Eibon Antique Shop", releaseVersion: "Global Launch",
    strengths: ["Reliable team sustain", "Good survivability in prolonged fights"],
    weaknesses: ["Limited personal damage output"],
    gameplayNotes: "Rotate in during a healing window; his Liquid archetype pairs well with Esper Cycle reactions.",
    skills: [{ name: "Esper Ability", type: "Combat Role: Survival + Healing", desc: "Sustains the active team through prolonged anomaly encounters." }],
    tier: "B" },
  { id: "c-skia", gameId: "neverness-to-everness", name: "Skia", rarity: 4, rarityText: "A-Class", element: "Lakshana", weaponType: "Gas", role: "Damage", region: "Bureau of Animal Control (ETD-4)", releaseVersion: "Global Launch",
    strengths: ["Accessible free-to-obtain damage dealer", "Gas archetype synergy in swap combos"],
    weaknesses: ["Falls behind S-Class damage dealers late-game"],
    gameplayNotes: "Weave into the active rotation for Lakshana-attribute damage between swaps.",
    skills: [{ name: "Esper Ability", type: "Combat Role: Damage", desc: "Lakshana-attribute offense, obtained via the standard banner." }],
    tier: "B" },
  { id: "c-haniel", gameId: "neverness-to-everness", name: "Haniel", rarity: 4, rarityText: "A-Class", element: "Psyche", weaponType: "Solid", role: "Support, Buff + DMG Boost", region: "Sterry Express", releaseVersion: "Global Launch",
    strengths: ["Free first pull after unlocking gacha — always available", "Team-wide damage boost support"],
    weaknesses: ["Outclassed by limited-banner supports late-game"],
    gameplayNotes: "Slot in as an early support buffer while building toward S-Class supports.",
    skills: [{ name: "Esper Ability", type: "Combat Role: Support", desc: "Buffs the active team's damage output." }],
    tier: "C" },
  { id: "c-lacrimosa", gameId: "neverness-to-everness", name: "Lacrimosa", rarity: 5, rarityText: "S-Class", element: "Chaos", weaponType: "Unknown", role: "Ranged AOE, DPS", region: "Bureau of Anomaly Control's ETD-4", releaseVersion: "Global Launch",
    strengths: ["Strong ranged AoE clear", "S-Class Chaos-attribute damage"],
    weaknesses: ["Limited-availability character"],
    gameplayNotes: "Bring for wide-pull AoE encounters; pairs with Esper Cycle reaction setups.",
    skills: [{ name: "Esper Ability", type: "Combat Role: Ranged AOE / DPS", desc: "Chaos-attribute area damage." }],
    tier: "S" },
];

const SEED_MATERIALS = [
  { id: "m-agnidus", gameId: "genshin-impact", name: "Agnidus Agate", category: "Ascension Gem", source: "Pyro weekly boss" },
  { id: "m-recipe", gameId: "genshin-impact", name: "Guide to Freedom", category: "Talent Book", source: "Forsaken Rift domain" },
];

const SEED_WEAPONS = [
  { id: "w-widsith", gameId: "genshin-impact", kind: "Catalyst", name: "The Widsith", rarity: 4, effect: "Random elemental damage buff on hit." },
  { id: "w-lions-roar", gameId: "genshin-impact", kind: "Sword", name: "Lion's Roar", rarity: 4, effect: "DMG bonus vs Pyro/Electro-affected foes." },
  { id: "w-serpent-spine", gameId: "genshin-impact", kind: "Polearm/All", name: "Serpent Spine", rarity: 4, effect: "Stacking DMG% at the cost of taking more damage." },
];

const SEED_DOMAINS = [
  { id: "d-forsaken-rift", gameId: "genshin-impact", name: "Forsaken Rift", location: "Mondstadt", days: ["Mon", "Thu", "Sun"], difficulty: "Scales with AR", drops: "Freedom talent books", recommended: "Sword/Claymore DPS" },
  { id: "d-hidden-palace", gameId: "genshin-impact", name: "Hidden Palace of Zhou Formula", location: "Liyue", days: ["Tue", "Fri", "Sun"], difficulty: "Scales with AR", drops: "Pyro ascension gems", recommended: "Any team, watch for Pyro-resist enemies" },
  { id: "d-hunt-cal", gameId: "honkai-star-rail", name: "Hunt Calibration Battle", location: "Herta Space Station", days: ["Mon", "Wed", "Fri", "Sun"], difficulty: "Scales with Trailblaze Level", drops: "Hunt Path trace materials", recommended: "Single-target DPS" },
  { id: "d-preservation-cal", gameId: "honkai-star-rail", name: "Preservation Calibration Battle", location: "Herta Space Station", days: ["Tue", "Thu", "Sat", "Sun"], difficulty: "Scales with Trailblaze Level", drops: "Preservation Path trace materials", recommended: "Any team, bring a shielder for practice" },
  { id: "d-notorious-hunt", gameId: "zenless-zone-zero", name: "Notorious Hunt: Bangboo Test", location: "Hollow Zero", days: ["Mon", "Tue", "Thu", "Fri"], difficulty: "Scales with Inter-Knot Level", drops: "Attribute-specific discs", recommended: "Stunner + DPS pair" },
  { id: "d-tidal-echo", gameId: "wuthering-waves", name: "Tidal Battlefield: Impermanence Heron", location: "Rinascita", days: ["Mon", "Wed", "Fri", "Sun"], difficulty: "Scales with Union Level", drops: "Echo experience + Fusion/Aero materials", recommended: "Any elemental-matched DPS" },
  { id: "d-cargo-escort", gameId: "arknights", name: "CE-6 Emergency Cargo Escort", location: "LMD Farming", days: ["Everyday"], difficulty: "Standard", drops: "LMD (currency), rarely furniture", recommended: "AoE Guards/Casters at chokepoints" },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const genUserId = () => "USER-" + Math.random().toString(36).slice(2, 9).toUpperCase();

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ============================================================
   STORAGE HELPERS
   Catalog data (games/characters/builds-that-are-public/tier
   lists) is shared=true because it's genuinely admin-managed
   content everyone should see. Accounts and private user
   content are shared=false (private per browser/user).
   NOTE: shared storage is visible to anyone using this artifact.
============================================================ */
async function storageGet(key, shared) {
  try {
    const r = await window.storage.get(key, shared);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
async function storageSet(key, value, shared) {
  try {
    await window.storage.set(key, JSON.stringify(value), shared);
    return true;
  } catch {
    return false;
  }
}

/* ============================================================
   FAVORITES (per-user, private)
============================================================ */
function useFavorites(currentUser) {
  const [ids, setIds] = useState([]);

  useEffect(() => {
    (async () => {
      if (!currentUser) return setIds([]);
      const f = (await storageGet(`favorites-${currentUser.id}`, false)) || [];
      setIds(f);
    })();
  }, [currentUser]);

  const toggle = useCallback(async (charId) => {
    if (!currentUser) return;
    const key = `favorites-${currentUser.id}`;
    const fresh = (await storageGet(key, false)) || [];
    const next = fresh.includes(charId) ? fresh.filter((x) => x !== charId) : [...fresh, charId];
    await storageSet(key, next, false);
    setIds(next);
  }, [currentUser]);

  return { ids, toggle, isFavorite: (id) => ids.includes(id) };
}

/* ============================================================
   NOTIFICATIONS — shared feed of admin-added characters,
   filtered per-user by their notification preference and by a
   private per-user "last read" marker.
============================================================ */
function useNotifications(currentUser) {
  const [feed, setFeed] = useState([]);
  const [lastReadAt, setLastReadAt] = useState(0);

  const loadFeed = useCallback(async () => {
    const f = (await storageGet("notification-feed", true)) || [];
    setFeed(f);
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  useEffect(() => {
    (async () => {
      if (!currentUser) return setLastReadAt(0);
      const r = await storageGet(`notif-read-${currentUser.id}`, false);
      setLastReadAt(r?.lastReadAt || 0);
    })();
  }, [currentUser]);

  const pushNewCharacter = useCallback(async (char, gameName) => {
    const fresh = (await storageGet("notification-feed", true)) || [];
    const next = [...fresh, { id: uid(), type: "new_character", gameId: char.gameId, gameName, characterName: char.name, createdAt: Date.now() }].slice(-40);
    await storageSet("notification-feed", next, true);
    setFeed(next);
  }, []);

  const markRead = useCallback(async () => {
    if (!currentUser) return;
    const now = Date.now();
    await storageSet(`notif-read-${currentUser.id}`, { lastReadAt: now }, false);
    setLastReadAt(now);
  }, [currentUser]);

  const relevant = currentUser
    ? feed.filter((n) => n.createdAt >= (currentUser.createdAt || 0) && (currentUser.notifyNewCharacters !== false))
    : [];
  const unreadCount = relevant.filter((n) => n.createdAt > lastReadAt).length;

  return { feed: relevant, unreadCount, markRead, pushNewCharacter };
}

/* ============================================================
   FARMING PLANS (per-user, private)
============================================================ */
function useFarmingPlans(currentUser) {
  const [plans, setPlans] = useState([]);

  const load = useCallback(async () => {
    if (!currentUser) return setPlans([]);
    const p = (await storageGet(`farming-${currentUser.id}`, false)) || [];
    setPlans(p);
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const savePlan = useCallback(async (plan) => {
    if (!currentUser) return;
    const key = `farming-${currentUser.id}`;
    const fresh = (await storageGet(key, false)) || [];
    const next = fresh.some((p) => p.id === plan.id) ? fresh.map((p) => (p.id === plan.id ? plan : p)) : [...fresh, plan];
    await storageSet(key, next, false);
    setPlans(next);
  }, [currentUser]);

  const deletePlan = useCallback(async (id) => {
    if (!currentUser) return;
    const key = `farming-${currentUser.id}`;
    const fresh = (await storageGet(key, false)) || [];
    const next = fresh.filter((p) => p.id !== id);
    await storageSet(key, next, false);
    setPlans(next);
  }, [currentUser]);

  return { plans, savePlan, deletePlan };
}

function Badge({ children, color, style }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
      padding: "3px 8px", borderRadius: 5,
      background: color ? color + "22" : T.borderSoft,
      color: color || T.textMuted, border: `1px solid ${color ? color + "55" : T.border}`,
      ...style,
    }}>{children}</span>
  );
}

function RarityStars({ n, text }) {
  if (text) return <span style={{ color: "#E3B567", fontSize: 12, fontWeight: 700, letterSpacing: "0.02em" }}>{text}</span>;
  return <span style={{ color: "#E3B567", fontSize: 13, letterSpacing: 1 }}>{"★".repeat(n)}</span>;
}

function Button({ children, onClick, variant = "primary", accent, style, type = "button", disabled }) {
  const base = {
    fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5,
    padding: "9px 16px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    border: "1px solid transparent", transition: "opacity .15s", opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    primary: { background: accent || T.shell, color: "#0D0E12" },
    ghost: { background: "transparent", color: T.text, border: `1px solid ${T.border}` },
    danger: { background: "transparent", color: T.danger, border: `1px solid ${T.danger}55` },
    subtle: { background: T.borderSoft, color: T.text },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Input({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      {label && <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>{label}</div>}
      <input {...props} style={{
        width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`,
        borderRadius: 7, padding: "9px 11px", color: T.text, fontSize: 14, fontFamily: "Inter, sans-serif",
        outline: "none",
      }} />
    </label>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: 16, cursor: onClick ? "pointer" : "default", ...style,
    }}>{children}</div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div style={{ padding: "48px 20px", textAlign: "center", color: T.textMuted, border: `1px dashed ${T.border}`, borderRadius: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5 }}>{body}</div>
    </div>
  );
}

/* ============================================================
   AUTH
============================================================ */
function useAuth() {
  const [users, setUsers] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      let u = await storageGet("users", true);
      if (!u) {
        // Seed one admin account so the CMS is reachable in the demo.
        const passHash = await sha256("admin123");
        u = [{ id: uid(), userIdPublic: genUserId(), username: "GameMaster", email: "gm@demo.local", passwordHash: passHash, role: "admin", createdAt: Date.now() }];
        await storageSet("users", u, true);
      }
      setUsers(u);
      const session = await storageGet("session", false);
      if (session?.userId) setCurrentUserId(session.userId);
      setLoading(false);
    })();
  }, []);

  const currentUser = useMemo(() => users?.find((u) => u.id === currentUserId) || null, [users, currentUserId]);

  const signup = useCallback(async (username, email, password) => {
    const name = username.trim();
    if (!name || name.length < 3 || name.length > 20) return { ok: false, error: "Username must be 3–20 characters." };
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return { ok: false, error: "Only letters, numbers, and underscores allowed." };
    if (RESERVED_USERNAMES.includes(name.toLowerCase())) return { ok: false, error: "That username is reserved." };
    const fresh = (await storageGet("users", true)) || users || [];
    if (fresh.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: `"${name}" is already taken.` };
    }
    if (!password || password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    const passwordHash = await sha256(password);
    const newUser = { id: uid(), userIdPublic: genUserId(), username: name, email, passwordHash, role: "user", createdAt: Date.now(), bio: "", visibility: "public", favoriteGameId: null };
    const updated = [...fresh, newUser];
    const saved = await storageSet("users", updated, true);
    if (!saved) return { ok: false, error: "Could not save account — try again." };
    setUsers(updated);
    setCurrentUserId(newUser.id);
    await storageSet("session", { userId: newUser.id }, false);
    return { ok: true };
  }, [users]);

  const login = useCallback(async (username, password) => {
    const fresh = (await storageGet("users", true)) || users || [];
    const found = fresh.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!found) return { ok: false, error: "No account with that username." };
    const hash = await sha256(password);
    if (hash !== found.passwordHash) return { ok: false, error: "Incorrect password." };
    setUsers(fresh);
    setCurrentUserId(found.id);
    await storageSet("session", { userId: found.id }, false);
    return { ok: true };
  }, [users]);

  const logout = useCallback(async () => {
    setCurrentUserId(null);
    await storageSet("session", {}, false);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const fresh = (await storageGet("users", true)) || users || [];
    const updated = fresh.map((u) => (u.id === currentUserId ? { ...u, ...patch } : u));
    await storageSet("users", updated, true);
    setUsers(updated);
  }, [users, currentUserId]);

  return { users, currentUser, loading, signup, login, logout, updateProfile, toast, setToast };
}

/* ============================================================
   CATALOG (characters etc.) — admin-editable, shared, persisted
============================================================ */
const TIER_NOTES = {
  "genshin-impact": "General overworld + Spiral Abyss usefulness, not min-maxed DPS charts.",
  "honkai-star-rail": "General Memory of Chaos usefulness across common team archetypes.",
  "zenless-zone-zero": "General Shiyu Defense usefulness; assumes signature W-Engine not required.",
  "wuthering-waves": "General Tower of Adversity usefulness with standard-banner Echoes.",
  "arknights": "General clearability across CM (Contingency Contract-level) content, not just story stages.",
  "neverness-to-everness": "General usefulness across story + anomaly-clear content at launch.",
};

function useCatalog() {
  const [characters, setCharacters] = useState(null);
  const [tierLists, setTierLists] = useState({});

  useEffect(() => {
    (async () => {
      let c = await storageGet("characters", true);
      if (!c) { c = [...SEED_CHARACTERS, ...SEED_ZZZ_CHARACTERS, ...SEED_WUWA_CHARACTERS, ...SEED_ARKNIGHTS_CHARACTERS, ...SEED_NTE_CHARACTERS]; await storageSet("characters", c, true); }
      setCharacters(c);
      const tls = {};
      for (const g of GAMES.filter((g) => g.implemented)) {
        let t = await storageGet(`tierlist-${g.id}`, true);
        if (!t) {
          t = { tiers: ["S", "A", "B", "C"], notes: TIER_NOTES[g.id] || "" };
          await storageSet(`tierlist-${g.id}`, t, true);
        }
        tls[g.id] = t;
      }
      setTierLists(tls);
    })();
  }, []);

  const saveCharacters = useCallback(async (next) => {
    setCharacters(next);
    await storageSet("characters", next, true);
  }, []);

  const upsertCharacter = useCallback(async (char) => {
    const fresh = (await storageGet("characters", true)) || characters || [];
    const exists = fresh.some((c) => c.id === char.id);
    const next = exists ? fresh.map((c) => (c.id === char.id ? char : c)) : [...fresh, char];
    await saveCharacters(next);
  }, [characters, saveCharacters]);

  const setArchived = useCallback(async (id, archived) => {
    const fresh = (await storageGet("characters", true)) || characters || [];
    const next = fresh.map((c) => (c.id === id ? { ...c, archived } : c));
    await saveCharacters(next);
  }, [characters, saveCharacters]);

  return { characters, tierLists, upsertCharacter, setArchived };
}

/* ============================================================
   USER CONTENT: builds & teams (private by default, shared list
   for "public" so other visitors of the artifact can browse)
============================================================ */
function useUserContent(currentUser) {
  const [builds, setBuilds] = useState([]);
  const [teams, setTeams] = useState([]);

  const load = useCallback(async () => {
    const b = (await storageGet("public-builds", true)) || [];
    const t = (await storageGet("public-teams", true)) || [];
    let ownB = [], ownT = [];
    if (currentUser) {
      ownB = (await storageGet(`builds-${currentUser.id}`, false)) || [];
      ownT = (await storageGet(`teams-${currentUser.id}`, false)) || [];
    }
    setBuilds([...ownB, ...b.filter((x) => x.userId !== currentUser?.id)]);
    setTeams([...ownT, ...t.filter((x) => x.userId !== currentUser?.id)]);
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const saveBuild = useCallback(async (build) => {
    if (!currentUser) return;
    const ownKey = `builds-${currentUser.id}`;
    const own = (await storageGet(ownKey, false)) || [];
    const next = own.some((b) => b.id === build.id) ? own.map((b) => (b.id === build.id ? build : b)) : [...own, build];
    await storageSet(ownKey, next, false);
    if (build.visibility === "public") {
      const pub = (await storageGet("public-builds", true)) || [];
      const nextPub = pub.some((b) => b.id === build.id) ? pub.map((b) => (b.id === build.id ? build : b)) : [...pub, build];
      await storageSet("public-builds", nextPub, true);
    }
    await load();
  }, [currentUser, load]);

  const saveTeam = useCallback(async (team) => {
    if (!currentUser) return;
    const ownKey = `teams-${currentUser.id}`;
    const own = (await storageGet(ownKey, false)) || [];
    const next = own.some((t) => t.id === team.id) ? own.map((t) => (t.id === team.id ? team : t)) : [...own, team];
    await storageSet(ownKey, next, false);
    if (team.visibility === "public") {
      const pub = (await storageGet("public-teams", true)) || [];
      const nextPub = pub.some((t) => t.id === team.id) ? pub.map((t) => (t.id === team.id ? team : t)) : [...pub, team];
      await storageSet("public-teams", nextPub, true);
    }
    await load();
  }, [currentUser, load]);

  return { builds, teams, saveBuild, saveTeam, reload: load };
}

/* ============================================================
   AUTH MODAL
============================================================ */
function AuthModal({ onClose, onLogin, onSignup }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    const res = mode === "login" ? await onLogin(username, password) : await onSignup(username, email, password);
    setBusy(false);
    if (!res.ok) setError(res.error); else onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.bgRaised, border: `1px solid ${T.border}`, borderRadius: 14, padding: 28, width: 340 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          <button onClick={() => setMode("login")} style={{ flex: 1, padding: 8, borderRadius: 7, border: "none", cursor: "pointer", background: mode === "login" ? T.shell : T.borderSoft, color: mode === "login" ? "#0D0E12" : T.text, fontWeight: 700 }}>Log in</button>
          <button onClick={() => setMode("signup")} style={{ flex: 1, padding: 8, borderRadius: 7, border: "none", cursor: "pointer", background: mode === "signup" ? T.shell : T.borderSoft, color: mode === "signup" ? "#0D0E12" : T.text, fontWeight: 700 }}>Sign up</button>
        </div>
        <form onSubmit={submit}>
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ShadowKnight" autoFocus />
          {mode === "signup" && <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />}
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          {error && <div style={{ color: T.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <Button type="submit" disabled={busy} style={{ width: "100%", marginTop: 4 }}>{busy ? "Working…" : mode === "login" ? "Log in" : "Create account"}</Button>
        </form>
        <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 14, lineHeight: 1.5 }}>
          Demo admin account: <b style={{ color: T.textMuted }}>GameMaster</b> / <b style={{ color: T.textMuted }}>admin123</b>.
          Passwords are hashed client-side (SHA-256) — a real deployment uses server-side bcrypt/argon2 with a real session store.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HOMEPAGE
============================================================ */
function Homepage({ onSelectGame, characters, builds, guides, currentUser, favApi, onOpenAuth }) {
  const featured = (characters || []).filter((c) => !c.archived).slice(0, 4);
  const recentBuilds = (builds || []).filter((b) => b.visibility === "public").slice(-3).reverse();

  return (
    <div>
      <div style={{
        borderRadius: 16, padding: "40px 32px", marginBottom: 28, position: "relative", overflow: "hidden",
        background: `linear-gradient(135deg, ${T.bgRaised}, ${T.bg})`, border: `1px solid ${T.border}`,
      }}>
        <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.05, color: T.text, maxWidth: 560, textTransform: "uppercase", letterSpacing: "0.01em" }}>
          One roster.<br />Every game you're grinding.
        </div>
        <div style={{ color: T.textMuted, marginTop: 14, maxWidth: 480, fontSize: 14.5, lineHeight: 1.6 }}>
          Builds, teams, tier lists, and farming routes for six gacha and tactical RPGs — kept current by an admin-editable database, not a hardcoded wiki dump.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <Button onClick={() => onSelectGame("genshin-impact")}>Browse Genshin Impact</Button>
          {!currentUser && <Button variant="ghost">See what's tracked</Button>}
        </div>
      </div>

      <SectionLabel>Games on the platform</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 30 }}>
        {GAMES.map((g) => (
          <Card key={g.id} onClick={() => onSelectGame(g.id)} style={{ display: "flex", flexDirection: "column", gap: 10, opacity: g.implemented ? 1 : 0.55 }}>
            <div style={{ width: 40, height: 40, borderRadius: 9, background: g.accent + "22", border: `1px solid ${g.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", color: g.accent, fontWeight: 800, fontSize: 13, fontFamily: "'Big Shoulders Display', sans-serif" }}>{g.initial}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{g.short}</div>
              <div style={{ fontSize: 12, color: T.textFaint }}>{g.franchise || "Standalone"}</div>
            </div>
            {!g.implemented && <Badge>Content coming in a later pass</Badge>}
          </Card>
        ))}
      </div>

      <SectionLabel>Featured characters</SectionLabel>
      {featured.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 30 }}>
          {featured.map((c) => <CharacterMiniCard key={c.id} c={c} favApi={favApi} onOpenAuth={onOpenAuth} />)}
        </div>
      ) : <EmptyState title="No characters yet" body="The admin hasn't added any characters." />}

      <SectionLabel>Recently published builds</SectionLabel>
      {recentBuilds.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {recentBuilds.map((b) => (
            <Card key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</div>
                <div style={{ fontSize: 12.5, color: T.textMuted }}>{b.characterName} · {b.buildType} · by {b.authorUsername}</div>
              </div>
              <Badge color={T.shell}>{b.buildType}</Badge>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No public builds yet" body="Publish a build from a character page to see it here." />}
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</div>;
}

function CharacterMiniCard({ c, onClick, favApi, onOpenAuth }) {
  const game = GAMES.find((g) => g.id === c.gameId);
  const isFav = favApi?.isFavorite(c.id);
  return (
    <Card onClick={onClick} style={{ opacity: c.archived ? 0.45 : 1, position: "relative" }}>
      {favApi && (
        <button
          onClick={(e) => { e.stopPropagation(); favApi.currentUser ? favApi.toggle(c.id) : onOpenAuth?.(); }}
          style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 15, color: isFav ? "#E2685F" : T.textFaint, zIndex: 2 }}
          aria-label="Toggle favorite"
        >{isFav ? "♥" : "♡"}</button>
      )}
      <div style={{ width: "100%", aspectRatio: "1", borderRadius: 8, background: `linear-gradient(160deg, ${game?.accent}33, ${T.bg})`, border: `1px solid ${game?.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Big Shoulders Display', sans-serif", fontSize: 30, fontWeight: 800, color: game?.accent, marginBottom: 10 }}>
        {c.name[0]}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
        <RarityStars n={c.rarity} text={c.rarityText} />
        <Badge color={game?.accent}>{c.element}</Badge>
        {c.archived && <Badge color={T.danger}>Archived</Badge>}
      </div>
    </Card>
  );
}

/* ============================================================
   GAME PAGE (Genshin — fully implemented)
============================================================ */
function GamePage({ game, characters, tierLists, currentUser, onOpenAuth, catalogApi, userContent, onOpenCharacter, favApi, notifyApi }) {
  const [tab, setTab] = useState("roster");
  const [query, setQuery] = useState("");
  const [elementFilter, setElementFilter] = useState("All");
  const cfg = GAME_CONFIG[game.id] || { l1: "Element", l2: "Weapon", l3: "Role", l4: "Region", domainWord: "Domains", teamSize: 4 };
  const visible = (characters || []).filter((c) => c.gameId === game.id && !c.archived);
  const elements = ["All", ...Array.from(new Set(visible.map((c) => c.element)))];
  const filtered = visible.filter((c) =>
    (elementFilter === "All" || c.element === elementFilter) &&
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  if (!game.implemented) {
    return (
      <div>
        <GameHeader game={game} />
        <EmptyState title={`${game.name} content is scheduled for a later pass`} body="The schema already supports it (see SCHEMA.md) — character data, builds, and teams just haven't been seeded yet." />
      </div>
    );
  }

  const tabs = [
    { id: "roster", label: "Roster" },
    { id: "builds", label: "Builds" },
    { id: "teams", label: "Team Builder" },
    { id: "domains", label: cfg.domainWord },
    { id: "tierlist", label: "Tier List" },
    { id: "admin", label: "Admin", adminOnly: true },
  ];

  return (
    <div>
      <GameHeader game={game} />
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 22, overflowX: "auto" }}>
        {tabs.filter((t) => !t.adminOnly || currentUser?.role === "admin").map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px 14px", fontWeight: 700, fontSize: 13.5,
            color: tab === t.id ? game.accent : T.textMuted, borderBottom: tab === t.id ? `2px solid ${game.accent}` : "2px solid transparent",
            whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "roster" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <input placeholder="Search characters…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, minWidth: 180, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 14 }} />
            <select value={elementFilter} onChange={(e) => setElementFilter(e.target.value)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 14 }}>
              {elements.map((el) => <option key={el} value={el}>{el === "All" ? `All (${cfg.l1})` : el}</option>)}
            </select>
          </div>
          {filtered.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {filtered.map((c) => <CharacterMiniCard key={c.id} c={c} onClick={() => onOpenCharacter(c)} favApi={favApi} onOpenAuth={onOpenAuth} />)}
            </div>
          ) : <EmptyState title="No characters match" body="Try a different search or filter." />}
        </>
      )}

      {tab === "builds" && <BuildsTab game={game} characters={visible} currentUser={currentUser} onOpenAuth={onOpenAuth} userContent={userContent} />}
      {tab === "teams" && <TeamsTab game={game} cfg={cfg} characters={visible} currentUser={currentUser} onOpenAuth={onOpenAuth} userContent={userContent} />}
      {tab === "domains" && <DomainsTab game={game} cfg={cfg} />}
      {tab === "tierlist" && <TierListTab game={game} characters={visible} tierList={tierLists[game.id]} currentUser={currentUser} catalogApi={catalogApi} />}
      {tab === "admin" && currentUser?.role === "admin" && <AdminTab game={game} cfg={cfg} characters={characters} catalogApi={catalogApi} notifyApi={notifyApi} />}
    </div>
  );
}

function GameHeader({ game }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: game.accent + "22", border: `1px solid ${game.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", color: game.accent, fontWeight: 800, fontSize: 17, fontFamily: "'Big Shoulders Display', sans-serif" }}>{game.initial}</div>
      <div>
        <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 28, textTransform: "uppercase" }}>{game.name}</div>
        <div style={{ color: T.textFaint, fontSize: 12.5 }}>{game.franchise || "Standalone title"}</div>
      </div>
    </div>
  );
}

/* ---- Character detail ---- */
function CharacterDetail({ c, game, onBack, favApi, onOpenAuth }) {
  const cfg = GAME_CONFIG[game.id] || { l1: "Element", l2: "Weapon", l3: "Role", l4: "Region" };
  const isFav = favApi?.isFavorite(c.id);
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", marginBottom: 16, fontSize: 13.5, fontWeight: 600 }}>← Back to {game.short}</button>
      <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ width: 120, height: 120, borderRadius: 14, background: `linear-gradient(160deg, ${game.accent}44, ${T.bg})`, border: `1px solid ${game.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Big Shoulders Display', sans-serif", fontSize: 46, fontWeight: 800, color: game.accent }}>{c.name[0]}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 30 }}>{c.name}</div>
            {favApi && (
              <button onClick={() => (favApi.currentUser ? favApi.toggle(c.id) : onOpenAuth?.())} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: isFav ? "#E2685F" : T.textFaint }} aria-label="Toggle favorite">
                {isFav ? "♥" : "♡"}
              </button>
            )}
          </div>
          <RarityStars n={c.rarity} text={c.rarityText} />
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <Badge color={game.accent}>{cfg.l1}: {c.element}</Badge>
            <Badge>{cfg.l2}: {c.weaponType}</Badge>
            <Badge>{c.role}</Badge>
            <Badge>{cfg.l4}: {c.region}</Badge>
            <Badge>v{c.releaseVersion}</Badge>
          </div>
        </div>
      </div>

      <Grid2>
        <Card>
          <SectionLabel>Strengths</SectionLabel>
          <ul style={{ margin: 0, paddingLeft: 18, color: T.textMuted, fontSize: 13.5, lineHeight: 1.7 }}>{c.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Card>
        <Card>
          <SectionLabel>Weaknesses</SectionLabel>
          <ul style={{ margin: 0, paddingLeft: 18, color: T.textMuted, fontSize: 13.5, lineHeight: 1.7 }}>{c.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Card>
      </Grid2>

      <div style={{ height: 16 }} />
      <Card>
        <SectionLabel>Skills</SectionLabel>
        {c.skills.map((s, i) => (
          <div key={i} style={{ padding: "10px 0", borderTop: i ? `1px solid ${T.borderSoft}` : "none" }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.name} <span style={{ color: T.textFaint, fontWeight: 500 }}>· {s.type}</span></div>
            <div style={{ color: T.textMuted, fontSize: 13, marginTop: 3 }}>{s.desc}</div>
          </div>
        ))}
      </Card>

      <div style={{ height: 16 }} />
      <Card>
        <SectionLabel>Gameplay notes</SectionLabel>
        <div style={{ color: T.textMuted, fontSize: 13.5, lineHeight: 1.6 }}>{c.gameplayNotes}</div>
      </Card>
    </div>
  );
}

function Grid2({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>;
}

/* ---- Builds ---- */
function BuildsTab({ game, characters, currentUser, onOpenAuth, userContent }) {
  const [showForm, setShowForm] = useState(false);
  const gameBuilds = userContent.builds.filter((b) => b.gameId === game.id);
  const [form, setForm] = useState({ characterId: characters[0]?.id || "", title: "", buildType: "DPS", notes: "", visibility: "private" });

  const submit = async (e) => {
    e.preventDefault();
    if (!currentUser) return onOpenAuth();
    const character = characters.find((c) => c.id === form.characterId);
    await userContent.saveBuild({
      id: uid(), userId: currentUser.id, authorUsername: currentUser.username, gameId: game.id,
      characterId: form.characterId, characterName: character?.name, title: form.title || `${character?.name} ${form.buildType}`,
      buildType: form.buildType, notes: form.notes, visibility: form.visibility, createdAt: Date.now(),
    });
    setShowForm(false);
    setForm({ characterId: characters[0]?.id || "", title: "", buildType: "DPS", notes: "", visibility: "private" });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionLabel>Builds</SectionLabel>
        <Button accent={game.accent} onClick={() => (currentUser ? setShowForm((s) => !s) : onOpenAuth())}>{showForm ? "Cancel" : "New build"}</Button>
      </div>
      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <form onSubmit={submit}>
            <label style={{ display: "block", marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>Character</div>
              <select value={form.characterId} onChange={(e) => setForm({ ...form, characterId: e.target.value })} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "9px 11px", color: T.text }}>
                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. F2P Off-field Pyro" />
            <label style={{ display: "block", marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>Build type</div>
              <select value={form.buildType} onChange={(e) => setForm({ ...form, buildType: e.target.value })} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "9px 11px", color: T.text }}>
                {["DPS", "Sub-DPS", "Support", "F2P", "Beginner", "Endgame"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ display: "block", marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>Notes</div>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "9px 11px", color: T.text, fontFamily: "Inter, sans-serif", fontSize: 13.5 }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13 }}>
              <input type="checkbox" checked={form.visibility === "public"} onChange={(e) => setForm({ ...form, visibility: e.target.checked ? "public" : "private" })} />
              Publish publicly
            </label>
            <Button type="submit" accent={game.accent}>Save build</Button>
          </form>
        </Card>
      )}
      {gameBuilds.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {gameBuilds.map((b) => (
            <Card key={b.id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{b.title}</div>
                  <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 2 }}>{b.characterName} · by {b.authorUsername}</div>
                  {b.notes && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 8 }}>{b.notes}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <Badge color={game.accent}>{b.buildType}</Badge>
                  <Badge color={b.visibility === "public" ? T.good : T.textFaint}>{b.visibility}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No builds yet" body="Be the first to save one for this game." />}
    </div>
  );
}

/* ---- Teams ---- */
function TeamsTab({ game, cfg, characters, currentUser, onOpenAuth, userContent }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [visibility, setVisibility] = useState("private");
  const gameTeams = userContent.teams.filter((t) => t.gameId === game.id);
  const maxSize = cfg?.teamSize || 4;

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < maxSize ? [...s, id] : s));

  const submit = async () => {
    if (!currentUser) return onOpenAuth();
    if (!name || selected.length === 0) return;
    await userContent.saveTeam({
      id: uid(), userId: currentUser.id, authorUsername: currentUser.username, gameId: game.id,
      name, characterIds: selected, characterNames: selected.map((id) => characters.find((c) => c.id === id)?.name),
      visibility, createdAt: Date.now(),
    });
    setName(""); setSelected([]); setVisibility("private");
  };

  return (
    <div>
      <SectionLabel>Build a team (up to {maxSize})</SectionLabel>
      <Card style={{ marginBottom: 16 }}>
        <Input label="Team name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vaporize Core" />
        <div style={{ fontSize: 12.5, color: T.textMuted, fontWeight: 600, marginBottom: 8 }}>Select characters ({selected.length}/{maxSize})</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8, marginBottom: 14 }}>
          {characters.map((c) => (
            <div key={c.id} onClick={() => toggle(c.id)} style={{
              cursor: "pointer", borderRadius: 8, padding: 8, textAlign: "center", fontSize: 12, fontWeight: 700,
              border: `1px solid ${selected.includes(c.id) ? game.accent : T.border}`,
              background: selected.includes(c.id) ? game.accent + "22" : T.bg, color: selected.includes(c.id) ? game.accent : T.text,
            }}>{c.name}</div>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13 }}>
          <input type="checkbox" checked={visibility === "public"} onChange={(e) => setVisibility(e.target.checked ? "public" : "private")} />
          Publish publicly
        </label>
        <Button accent={game.accent} onClick={submit}>Save team</Button>
      </Card>
      {gameTeams.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {gameTeams.map((t) => (
            <Card key={t.id}>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 2 }}>by {t.authorUsername}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {t.characterNames.map((n, i) => <Badge key={i} color={game.accent}>{n}</Badge>)}
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No teams yet" body="Put together your first squad above." />}
    </div>
  );
}

/* ---- Domains ---- */
function DomainsTab({ game, cfg }) {
  const domains = SEED_DOMAINS.filter((d) => d.gameId === game.id);
  return (
    <div>
      <SectionLabel>{cfg.domainWord}</SectionLabel>
      <div style={{ display: "grid", gap: 10 }}>
        {domains.map((d) => (
          <Card key={d.id}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{d.name}</div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 8 }}>{d.location} · {d.difficulty}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{d.days.map((day) => <Badge key={day}>{day}</Badge>)}</div>
            <div style={{ fontSize: 13, color: T.textMuted }}>Drops: {d.drops}</div>
            <div style={{ fontSize: 13, color: T.textMuted }}>Recommended: {d.recommended}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---- Tier list ---- */
function TierListTab({ game, characters, tierList, currentUser, catalogApi }) {
  const [busy, setBusy] = useState(null);
  const tiers = tierList?.tiers || ["S", "A", "B", "C"];
  const grouped = tiers.map((t) => ({ tier: t, chars: characters.filter((c) => (c.tier || "B") === t) }));

  const move = async (charId, newTier) => {
    setBusy(charId);
    const char = characters.find((c) => c.id === charId);
    await catalogApi.upsertCharacter({ ...char, tier: newTier });
    setBusy(null);
  };

  return (
    <div>
      <SectionLabel>Tier list</SectionLabel>
      <div style={{ fontSize: 13, color: T.textFaint, marginBottom: 16 }}>{tierList?.notes}</div>
      {grouped.map((g) => (
        <div key={g.tier} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "stretch" }}>
          <div style={{ width: 44, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 22, color: game.accent, background: game.accent + "1A", borderRadius: 8, border: `1px solid ${game.accent}44` }}>{g.tier}</div>
          <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "8px 0" }}>
            {g.chars.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                {currentUser?.role === "admin" && (
                  <select disabled={busy === c.id} value={c.tier || "B"} onChange={(e) => move(c.id, e.target.value)} style={{ background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 5, fontSize: 11 }}>
                    {tiers.map((t) => <option key={t}>{t}</option>)}
                  </select>
                )}
              </div>
            ))}
            {!g.chars.length && <span style={{ fontSize: 12.5, color: T.textFaint }}>—</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Admin CMS ---- */
function emptyCharForm(gameId) {
  return { id: "", gameId, name: "", rarity: 4, rarityText: "", element: "Pyro", weaponType: "Sword", role: "Sub-DPS", region: "Mondstadt", releaseVersion: "1.0", strengths: "", weaknesses: "", gameplayNotes: "", skills: "", tier: "B" };
}

function AdminTab({ game, cfg, characters, catalogApi, notifyApi }) {
  const [editing, setEditing] = useState(null); // form object or null
  const gameChars = characters.filter((c) => c.gameId === game.id);

  const startNew = () => setEditing(emptyCharForm(game.id));
  const startEdit = (c) => setEditing({
    ...c,
    rarityText: c.rarityText || "",
    strengths: c.strengths.join("\n"),
    weaknesses: c.weaknesses.join("\n"),
    skills: c.skills.map((s) => `${s.name} | ${s.type} | ${s.desc}`).join("\n"),
  });

  const save = async (e) => {
    e.preventDefault();
    const isNew = !editing.id;
    const char = {
      id: editing.id || `c-${uid()}`,
      gameId: game.id,
      name: editing.name.trim(),
      rarity: Number(editing.rarity),
      rarityText: editing.rarityText?.trim() || undefined,
      element: editing.element,
      weaponType: editing.weaponType,
      role: editing.role,
      region: editing.region,
      releaseVersion: editing.releaseVersion,
      strengths: editing.strengths.split("\n").map((s) => s.trim()).filter(Boolean),
      weaknesses: editing.weaknesses.split("\n").map((s) => s.trim()).filter(Boolean),
      gameplayNotes: editing.gameplayNotes,
      tier: editing.tier,
      skills: editing.skills.split("\n").filter(Boolean).map((line) => {
        const [name, type, desc] = line.split("|").map((s) => s.trim());
        return { name: name || "Skill", type: type || "Elemental Skill", desc: desc || "" };
      }),
      archived: editing.archived || false,
    };
    if (!char.name) return;
    await catalogApi.upsertCharacter(char);
    if (isNew && notifyApi) await notifyApi.pushNewCharacter(char, game.name);
    setEditing(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionLabel>Admin — {game.short} character management</SectionLabel>
        {!editing && <Button accent={game.accent} onClick={startNew}>Add character</Button>}
      </div>

      {editing ? (
        <Card style={{ marginBottom: 20 }}>
          <form onSubmit={save}>
            <Grid2>
              <Input label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input label="Rarity (1–6)" type="number" min={1} max={6} value={editing.rarity} onChange={(e) => setEditing({ ...editing, rarity: e.target.value })} />
            </Grid2>
            <Input label="Rarity label override (optional — e.g. 'S-Class' instead of stars)" value={editing.rarityText} onChange={(e) => setEditing({ ...editing, rarityText: e.target.value })} />
            <Grid2>
              <Input label={cfg.l1} value={editing.element} onChange={(e) => setEditing({ ...editing, element: e.target.value })} />
              <Input label={cfg.l2} value={editing.weaponType} onChange={(e) => setEditing({ ...editing, weaponType: e.target.value })} />
            </Grid2>
            <Grid2>
              <Input label={cfg.l3} value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} />
              <Input label={cfg.l4} value={editing.region} onChange={(e) => setEditing({ ...editing, region: e.target.value })} />
            </Grid2>
            <Input label="Release version" value={editing.releaseVersion} onChange={(e) => setEditing({ ...editing, releaseVersion: e.target.value })} />
            <label style={{ display: "block", marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>Strengths (one per line)</div>
              <textarea value={editing.strengths} onChange={(e) => setEditing({ ...editing, strengths: e.target.value })} rows={3} style={taStyle} />
            </label>
            <label style={{ display: "block", marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>Weaknesses (one per line)</div>
              <textarea value={editing.weaknesses} onChange={(e) => setEditing({ ...editing, weaknesses: e.target.value })} rows={2} style={taStyle} />
            </label>
            <label style={{ display: "block", marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>Skills — one per line: Name | Type | Description</div>
              <textarea value={editing.skills} onChange={(e) => setEditing({ ...editing, skills: e.target.value })} rows={3} style={taStyle} />
            </label>
            <label style={{ display: "block", marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>Gameplay notes</div>
              <textarea value={editing.gameplayNotes} onChange={(e) => setEditing({ ...editing, gameplayNotes: e.target.value })} rows={2} style={taStyle} />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="submit" accent={game.accent}>Save character</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        {gameChars.map((c) => (
          <Card key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: c.archived ? 0.5 : 1 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{c.name} {c.archived && <Badge color={T.danger} style={{ marginLeft: 6 }}>Archived</Badge>}</div>
              <div style={{ fontSize: 12, color: T.textFaint }}>{c.element} · {c.role} · Tier {c.tier}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={() => startEdit(c)}>Edit</Button>
              <Button variant={c.archived ? "subtle" : "danger"} onClick={() => catalogApi.setArchived(c.id, !c.archived)}>{c.archived ? "Restore" : "Archive"}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
const taStyle = { width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "9px 11px", color: T.text, fontFamily: "Inter, sans-serif", fontSize: 13 };

/* ============================================================
   PROFILE / DASHBOARD
============================================================ */
function Dashboard({ currentUser, builds, teams, updateProfile, favApi, characters, farmingApi }) {
  const own = { builds: builds.filter((b) => b.userId === currentUser.id), teams: teams.filter((t) => t.userId === currentUser.id) };
  const [bio, setBio] = useState(currentUser.bio || "");
  const [visibility, setVisibility] = useState(currentUser.visibility || "public");
  const [notifyNewCharacters, setNotifyNewCharacters] = useState(currentUser.notifyNewCharacters !== false);
  const favoriteChars = (characters || []).filter((c) => favApi?.ids.includes(c.id));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: T.shell + "22", border: `1px solid ${T.shell}55`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Big Shoulders Display', sans-serif", fontSize: 24, fontWeight: 800, color: T.shell }}>{currentUser.username[0].toUpperCase()}</div>
        <div>
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 24 }}>{currentUser.username}</div>
          <div style={{ fontSize: 12.5, color: T.textFaint }}>{currentUser.userIdPublic} · {currentUser.role === "admin" ? "Admin" : "Player"}</div>
        </div>
      </div>

      <Grid2>
        <Card>
          <SectionLabel>Profile settings</SectionLabel>
          <label style={{ display: "block", marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>Bio</div>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} style={taStyle} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13 }}>
            <input type="checkbox" checked={visibility === "public"} onChange={(e) => setVisibility(e.target.checked ? "public" : "private")} />
            Public profile
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13 }}>
            <input type="checkbox" checked={notifyNewCharacters} onChange={(e) => setNotifyNewCharacters(e.target.checked)} />
            Notify me when new characters are added
          </label>
          <Button onClick={() => updateProfile({ bio, visibility, notifyNewCharacters })}>Save profile</Button>
        </Card>
        <Card>
          <SectionLabel>Account</SectionLabel>
          <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 2 }}>
            Username: <b style={{ color: T.text }}>{currentUser.username}</b><br />
            Permanent User ID: <b style={{ color: T.text }}>{currentUser.userIdPublic}</b><br />
            Role: <b style={{ color: T.text }}>{currentUser.role}</b>
          </div>
        </Card>
      </Grid2>

      <div style={{ height: 20 }} />
      <SectionLabel>Favorites ({favoriteChars.length})</SectionLabel>
      {favoriteChars.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
          {favoriteChars.map((c) => <CharacterMiniCard key={c.id} c={c} favApi={favApi} />)}
        </div>
      ) : <EmptyState title="No favorites yet" body="Tap the heart on any character card to save it here." />}

      <SectionLabel>Your builds ({own.builds.length})</SectionLabel>
      {own.builds.length ? (
        <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          {own.builds.map((b) => <Card key={b.id}><b>{b.title}</b> — {b.characterName} <Badge style={{ marginLeft: 8 }}>{b.buildType}</Badge></Card>)}
        </div>
      ) : <EmptyState title="No builds saved yet" body="Save one from any character page." />}

      <SectionLabel>Your teams ({own.teams.length})</SectionLabel>
      {own.teams.length ? (
        <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          {own.teams.map((t) => <Card key={t.id}><b>{t.name}</b> — {t.characterNames.join(", ")}</Card>)}
        </div>
      ) : <EmptyState title="No teams saved yet" body="Build one from a game's Team Builder tab." />}

      <FarmingPlanner characters={characters} farmingApi={farmingApi} />
      <CurrencyCalculator />
    </div>
  );
}

/* ---- Farming planner ---- */
function FarmingPlanner({ characters, farmingApi }) {
  const [charId, setCharId] = useState(characters?.[0]?.id || "");
  const [items, setItems] = useState([{ name: "", needed: 0, collected: 0 }]);

  const updateItem = (i, patch) => setItems((its) => its.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((its) => [...its, { name: "", needed: 0, collected: 0 }]);

  const save = async () => {
    const character = characters.find((c) => c.id === charId);
    if (!character) return;
    await farmingApi.savePlan({
      id: uid(), characterId: charId, characterName: character.name, gameId: character.gameId,
      items: items.filter((it) => it.name.trim()), createdAt: Date.now(),
    });
    setItems([{ name: "", needed: 0, collected: 0 }]);
  };

  return (
    <>
      <div style={{ height: 8 }} />
      <SectionLabel>Farming planner ({farmingApi.plans.length})</SectionLabel>
      <Card style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>Character</div>
          <select value={charId} onChange={(e) => setCharId(e.target.value)} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "9px 11px", color: T.text }}>
            {(characters || []).map((c) => <option key={c.id} value={c.id}>{c.name} ({GAMES.find((g) => g.id === c.gameId)?.short})</option>)}
          </select>
        </label>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input placeholder="Material name" value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} style={{ flex: 2, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 9px", color: T.text, fontSize: 13 }} />
            <input type="number" placeholder="Needed" value={it.needed} onChange={(e) => updateItem(i, { needed: Number(e.target.value) })} style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 9px", color: T.text, fontSize: 13 }} />
            <input type="number" placeholder="Have" value={it.collected} onChange={(e) => updateItem(i, { collected: Number(e.target.value) })} style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 9px", color: T.text, fontSize: 13 }} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" onClick={addItem}>+ Material</Button>
          <Button onClick={save}>Save plan</Button>
        </div>
      </Card>
      {farmingApi.plans.length ? (
        <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          {farmingApi.plans.map((p) => (
            <Card key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <b>{p.characterName}</b>
                <Button variant="danger" onClick={() => farmingApi.deletePlan(p.id)} style={{ padding: "4px 9px", fontSize: 12 }}>Remove</Button>
              </div>
              {p.items.map((it, i) => {
                const pct = it.needed ? Math.min(100, Math.round((it.collected / it.needed) * 100)) : 0;
                return (
                  <div key={i} style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 4 }}>
                    {it.name}: {it.collected}/{it.needed} <span style={{ color: pct >= 100 ? T.good : T.textFaint }}>({pct}%)</span>
                  </div>
                );
              })}
            </Card>
          ))}
        </div>
      ) : null}
    </>
  );
}

/* ---- Currency / run calculator ---- */
function CurrencyCalculator() {
  const [gameId, setGameId] = useState("genshin-impact");
  const [current, setCurrent] = useState(60);
  const [perDay, setPerDay] = useState(180);
  const [costPerRun, setCostPerRun] = useState(20);
  const [targetRuns, setTargetRuns] = useState(5);
  const cfg = GAME_CONFIG[gameId];

  const runsNow = Math.floor(current / costPerRun);
  const currencyNeeded = Math.max(0, targetRuns * costPerRun - current);
  const daysToTarget = perDay > 0 ? Math.ceil(currencyNeeded / perDay) : Infinity;

  return (
    <>
      <div style={{ height: 8 }} />
      <SectionLabel>Currency calculator</SectionLabel>
      <Card>
        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 5, fontWeight: 600 }}>Game</div>
          <select value={gameId} onChange={(e) => setGameId(e.target.value)} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "9px 11px", color: T.text }}>
            {GAMES.filter((g) => g.implemented).map((g) => <option key={g.id} value={g.id}>{g.short} — {GAME_CONFIG[g.id].currency}</option>)}
          </select>
        </label>
        <Grid2>
          <Input label={`Current ${cfg.currency}`} type="number" value={current} onChange={(e) => setCurrent(Number(e.target.value))} />
          <Input label={`${cfg.currency}/day`} type="number" value={perDay} onChange={(e) => setPerDay(Number(e.target.value))} />
        </Grid2>
        <Grid2>
          <Input label="Cost per run" type="number" value={costPerRun} onChange={(e) => setCostPerRun(Number(e.target.value))} />
          <Input label="Target runs" type="number" value={targetRuns} onChange={(e) => setTargetRuns(Number(e.target.value))} />
        </Grid2>
        <div style={{ fontSize: 13.5, color: T.textMuted, lineHeight: 1.8, marginTop: 4 }}>
          You can run <b style={{ color: T.text }}>{runsNow}</b> times right now.<br />
          To reach {targetRuns} runs you need <b style={{ color: T.text }}>{currencyNeeded}</b> more {cfg.currency}
          {currencyNeeded > 0 && <> — about <b style={{ color: T.text }}>{daysToTarget}</b> day{daysToTarget === 1 ? "" : "s"} at your current rate.</>}
        </div>
      </Card>
    </>
  );
}

/* ============================================================
   ROOT APP
============================================================ */
export default function App() {
  const auth = useAuth();
  const catalog = useCatalog();
  const userContent = useUserContent(auth.currentUser);
  const favApi = useFavorites(auth.currentUser);
  favApi.currentUser = auth.currentUser; // convenience for CharacterMiniCard's inline check
  const notifyApi = useNotifications(auth.currentUser);
  const farmingApi = useFarmingPlans(auth.currentUser);
  const [route, setRoute] = useState({ view: "home" });
  const [showAuth, setShowAuth] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState("");

  const goHome = () => setRoute({ view: "home" });
  const goGame = (gameId) => setRoute({ view: "game", gameId });
  const goChar = (char) => setRoute({ view: "char", gameId: char.gameId, char });
  const goDashboard = () => setRoute({ view: "dashboard" });

  const currentGame = route.gameId ? GAMES.find((g) => g.id === route.gameId) : null;

  const searchResults = useMemo(() => {
    if (!search.trim() || !catalog.characters) return [];
    const q = search.toLowerCase();
    const chars = catalog.characters.filter((c) => !c.archived && c.name.toLowerCase().includes(q)).slice(0, 5).map((c) => ({ kind: "character", id: c.id, label: c.name, sub: GAMES.find((g) => g.id === c.gameId)?.short, data: c }));
    const games = GAMES.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 3).map((g) => ({ kind: "game", id: g.id, label: g.name, sub: g.franchise || "Standalone", data: g }));
    const players = (auth.users || []).filter((u) => u.visibility !== "private" && u.username.toLowerCase().includes(q)).slice(0, 3).map((u) => ({ kind: "player", id: u.id, label: u.username, sub: u.userIdPublic, data: u }));
    return [...games, ...chars, ...players];
  }, [search, catalog.characters, auth.users]);

  if (auth.loading || !catalog.characters) {
    return <div style={{ background: T.bg, color: T.textMuted, height: 400, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>Loading platform…</div>;
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: T.bg, color: T.text, minHeight: 600, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.border}` }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <div style={{ width: 210, borderRight: `1px solid ${T.border}`, padding: 16, flexShrink: 0, background: T.bgRaised }}>
          <div onClick={goHome} style={{ cursor: "pointer", fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 22, letterSpacing: "0.02em" }}>
            ROSTER<span style={{ color: T.shell }}>BASE</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Games</div>
          {GAMES.map((g) => (
            <div key={g.id} onClick={() => goGame(g.id)} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 8px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
              background: route.gameId === g.id ? g.accent + "1A" : "transparent",
            }}>
              <div style={{ width: 22, height: 22, borderRadius: 5, background: g.accent + "33", color: g.accent, fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Big Shoulders Display', sans-serif" }}>{g.initial}</div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: route.gameId === g.id ? g.accent : T.textMuted }}>{g.short}</span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 22px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search characters, builds, players…" style={{ width: "100%", boxSizing: "border-box", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", color: T.text, fontSize: 13.5 }} />
              {searchResults.length > 0 && (
                <div style={{ position: "absolute", top: "110%", left: 0, right: 0, background: T.bgRaised, border: `1px solid ${T.border}`, borderRadius: 8, zIndex: 20, overflow: "hidden" }}>
                  {searchResults.map((r) => (
                    <div key={r.kind + r.id} onClick={() => {
                      if (r.kind === "character") goChar(r.data);
                      else if (r.kind === "game") goGame(r.data.id);
                      setSearch("");
                    }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${T.borderSoft}`, display: "flex", justifyContent: "space-between" }}>
                      <span>{r.label} <span style={{ color: T.textFaint }}>· {r.sub}</span></span>
                      <Badge>{r.kind}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }} />
            {auth.currentUser && (
              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowNotifs((s) => !s); if (!showNotifs) notifyApi.markRead(); }} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", cursor: "pointer", color: T.text, fontSize: 14, position: "relative" }}>
                  🔔
                  {notifyApi.unreadCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: T.danger, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "1px 5px" }}>{notifyApi.unreadCount}</span>}
                </button>
                {showNotifs && (
                  <div style={{ position: "absolute", top: "115%", right: 0, width: 260, background: T.bgRaised, border: `1px solid ${T.border}`, borderRadius: 8, zIndex: 30, maxHeight: 300, overflowY: "auto" }}>
                    {notifyApi.feed.length ? [...notifyApi.feed].reverse().map((n) => (
                      <div key={n.id} style={{ padding: "9px 12px", fontSize: 12.5, borderBottom: `1px solid ${T.borderSoft}`, color: T.textMuted }}>
                        New character <b style={{ color: T.text }}>{n.characterName}</b> added to {n.gameName}
                      </div>
                    )) : <div style={{ padding: 14, fontSize: 12.5, color: T.textFaint }}>No notifications yet.</div>}
                  </div>
                )}
              </div>
            )}
            {auth.currentUser ? (
              <>
                <span style={{ fontSize: 13, color: T.textMuted }}>{auth.currentUser.username}</span>
                {auth.currentUser.role === "admin" && <Badge color={T.shell}>Admin</Badge>}
                <Button variant="ghost" onClick={goDashboard}>Dashboard</Button>
                <Button variant="ghost" onClick={auth.logout}>Log out</Button>
              </>
            ) : (
              <Button onClick={() => setShowAuth(true)}>Log in / Sign up</Button>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: "24px 28px" }}>
            {route.view === "home" && (
              <Homepage onSelectGame={goGame} characters={catalog.characters} builds={userContent.builds} currentUser={auth.currentUser} favApi={favApi} onOpenAuth={() => setShowAuth(true)} />
            )}
            {route.view === "game" && currentGame && (
              <GamePage
                game={currentGame}
                characters={catalog.characters}
                tierLists={catalog.tierLists}
                currentUser={auth.currentUser}
                onOpenAuth={() => setShowAuth(true)}
                catalogApi={catalog}
                userContent={userContent}
                onOpenCharacter={goChar}
                favApi={favApi}
                notifyApi={notifyApi}
              />
            )}
            {route.view === "char" && (
              <CharacterDetail c={route.char} game={GAMES.find((g) => g.id === route.gameId)} onBack={() => goGame(route.gameId)} favApi={favApi} onOpenAuth={() => setShowAuth(true)} />
            )}
            {route.view === "dashboard" && auth.currentUser && (
              <Dashboard currentUser={auth.currentUser} builds={userContent.builds} teams={userContent.teams} updateProfile={auth.updateProfile} favApi={favApi} characters={catalog.characters} farmingApi={farmingApi} />
            )}
          </div>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={auth.login} onSignup={auth.signup} />}
    </div>
  );
}
