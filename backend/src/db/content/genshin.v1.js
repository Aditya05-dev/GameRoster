// Genshin starter content pack.
// Factual catalog fields are based on HoYoWiki / in-game reference data.
// Recommendation rows are editorial starter guidance, intentionally labelled as such.
// Keep current meta-sensitive claims out of this file unless they have been reviewed.

export const SOURCE = {
  factualSource: "HoYoWiki / in-game reference",
  reviewedOn: "2026-09-09",
  pack: "genshin-v1"
};

export const characters = [
  {
    slug:"xiangling",name:"Xiangling",rarity:4,releaseVersion:"1.0",
    stats:{element:"Pyro",weaponType:"Polearm",role:"Off-field DPS",region:"Liyue"},
    strengths:["Strong off-field Pyro application","Burst remains active after swapping characters","Fits many reaction-focused teams"],
    weaknesses:["Burst has a high Energy cost","Often wants substantial Energy Recharge"],
    gameplayNotes:"Use Guoba for particles and Pyro application, then cast Pyronado before swapping to teammates who can trigger reactions.",
    skills:[
      {name:"Guoba Attack",type:"Elemental Skill",description:"Summons Guoba, who periodically deals Pyro damage in front of him."},
      {name:"Pyronado",type:"Elemental Burst",description:"Creates a rotating Pyro attack that follows the active character for its duration."}
    ]
  },
  {
    slug:"bennett",name:"Bennett",rarity:4,releaseVersion:"1.0",
    stats:{element:"Pyro",weaponType:"Sword",role:"Support / Healer",region:"Mondstadt"},
    strengths:["Powerful team ATK support","Reliable healing inside his Burst field","Excellent Pyro battery utility"],
    weaknesses:["Support is tied to a field","High Burst uptime requires enough Energy Recharge"],
    gameplayNotes:"Cast Fantastic Voyage before your main damage window, then rotate through teammates while staying in the field when possible.",
    skills:[
      {name:"Passion Overload",type:"Elemental Skill",description:"Performs a Pyro sword attack; holding changes the attack pattern."},
      {name:"Fantastic Voyage",type:"Elemental Burst",description:"Creates an Inspiration Field that heals and can grant an ATK bonus to characters inside it."}
    ]
  },
  {
    slug:"xingqiu",name:"Xingqiu",rarity:4,releaseVersion:"1.0",
    stats:{element:"Hydro",weaponType:"Sword",role:"Off-field DPS / Support",region:"Liyue"},
    strengths:["Excellent off-field Hydro application","Adds interruption resistance and damage reduction","Works with many Normal Attack-driven teams"],
    weaknesses:["Burst is Energy hungry","Needs careful rotation timing for consistent uptime"],
    gameplayNotes:"Use his Skill to generate particles, then Burst before swapping to the on-field attacker so Rain Swords trigger alongside Normal Attacks.",
    skills:[
      {name:"Guhua Sword: Fatal Rainscreen",type:"Elemental Skill",description:"Deals Hydro damage and creates Rain Swords that provide defensive utility."},
      {name:"Guhua Sword: Raincutter",type:"Elemental Burst",description:"Creates a sword-rain effect that performs coordinated Hydro attacks while another character uses Normal Attacks."}
    ]
  },
  {
    slug:"zhongli",name:"Zhongli",rarity:5,releaseVersion:"1.1",
    stats:{element:"Geo",weaponType:"Polearm",role:"Shield Support",region:"Liyue"},
    strengths:["Very durable shield","Shield provides broad resistance reduction to nearby enemies","Comfortable support for many teams"],
    weaknesses:["Defensive builds contribute less personal damage","Geo can interfere with some reaction setups if used carelessly"],
    gameplayNotes:"Hold his Skill to create the Jade Shield before the team's damage rotation; use Burst mainly when its crowd control or damage is worth the field time.",
    skills:[
      {name:"Dominus Lapidis",type:"Elemental Skill",description:"Creates a Stone Stele on press; holding creates a Jade Shield and deals nearby Geo damage."},
      {name:"Planet Befall",type:"Elemental Burst",description:"Calls down a meteor that deals Geo damage and petrifies many affected enemies."}
    ]
  },
  {
    slug:"kaedehara-kazuha",name:"Kaedehara Kazuha",rarity:5,releaseVersion:"1.6",
    stats:{element:"Anemo",weaponType:"Sword",role:"Support / Swirl",region:"Inazuma"},
    strengths:["Strong elemental damage support through Swirl","Excellent grouping and mobility","Flexible in many Pyro, Hydro, Electro and Cryo teams"],
    weaknesses:["Requires correct element absorption/Swirl setup","Grouping is less valuable against heavy or immovable enemies"],
    gameplayNotes:"Apply the element you want to support, then trigger Swirl with his Skill or Burst. Elemental Mastery is a common focus for support builds.",
    skills:[
      {name:"Chihayaburu",type:"Elemental Skill",description:"Pulls nearby objects and enemies, launches Kazuha into the air, and enables a special plunging attack."},
      {name:"Kazuha Slash",type:"Elemental Burst",description:"Deals Anemo damage and creates a field that can absorb an element and deal repeated damage."}
    ]
  },
  {
    slug:"raiden-shogun",name:"Raiden Shogun",rarity:5,releaseVersion:"2.1",
    stats:{element:"Electro",weaponType:"Polearm",role:"Burst DPS / Battery",region:"Inazuma"},
    strengths:["Restores Energy to the team during Burst","Strong Burst-focused damage window","Buffs teammates' Elemental Burst damage through her Skill"],
    weaknesses:["Most personal damage is concentrated in Burst","Rotations benefit from teammates that spend significant Burst Energy"],
    gameplayNotes:"Use her Skill early in the rotation, spend teammates' Bursts to build Resolve, then finish the cycle with Raiden's Burst.",
    skills:[
      {name:"Transcendence: Baleful Omen",type:"Elemental Skill",description:"Deals Electro damage and grants coordinated attacks while increasing party members' Elemental Burst damage based on Burst cost."},
      {name:"Secret Art: Musou Shinsetsu",type:"Elemental Burst",description:"Unleashes Musou no Hitotachi and enters a sword state that converts attacks to Electro damage and restores party Energy."}
    ]
  },
  {
    slug:"nahida",name:"Nahida",rarity:5,releaseVersion:"3.2",
    stats:{element:"Dendro",weaponType:"Catalyst",role:"Off-field Dendro / Support",region:"Sumeru"},
    strengths:["Reliable multi-target Dendro application","Excellent Elemental Mastery support","Strong in many Bloom, Hyperbloom, Quicken and Burning variants"],
    weaknesses:["Can be fragile on field","Some multi-wave encounters require re-marking new enemies"],
    gameplayNotes:"Mark enemies with her Skill, trigger elemental reactions to activate Tri-Karma Purification, and use her Burst when its team buffs benefit the rotation.",
    skills:[
      {name:"All Schemes to Know",type:"Elemental Skill",description:"Marks enemies with Seeds of Skandha; reactions on linked targets trigger Tri-Karma Purification."},
      {name:"Illusory Heart",type:"Elemental Burst",description:"Creates the Shrine of Maya, whose effects vary with Pyro, Electro and Hydro party members."}
    ]
  },
  {
    slug:"wanderer",name:"Wanderer",rarity:5,releaseVersion:"3.3",
    stats:{element:"Anemo",weaponType:"Catalyst",role:"On-field DPS",region:"Sumeru"},
    strengths:["Mobile ranged on-field damage","Unique airborne combat state","Can benefit from several common attack buffers"],
    weaknesses:["Can be interrupted without protection","Requires careful management of his airborne stamina-like resource"],
    gameplayNotes:"Enter the Windfavored state with his Skill, use Normal/Charged Attacks during the aerial window, and time his Burst near the end of the damage sequence.",
    skills:[
      {name:"Hanega: Song of the Wind",type:"Elemental Skill",description:"Deals Anemo damage and enters the Windfavored state, allowing airborne movement and enhanced attacks."},
      {name:"Kyougen: Five Ceremonial Plays",type:"Elemental Burst",description:"Compresses the atmosphere into repeated instances of Anemo area damage."}
    ]
  },
  {
    slug:"alhaitham",name:"Alhaitham",rarity:5,releaseVersion:"3.4",
    stats:{element:"Dendro",weaponType:"Sword",role:"On-field Dendro DPS",region:"Sumeru"},
    strengths:["Strong on-field Dendro application","Excellent synergy with Quicken and Hyperbloom teams","Mirror mechanics reward clean rotations"],
    weaknesses:["Damage drops when Chisel-Light Mirrors expire","Rotation mistakes can reduce infusion uptime"],
    gameplayNotes:"Maintain Chisel-Light Mirrors to keep Dendro infusion and Projection Attacks active. Plan Skill, Burst and Charged/Plunging attacks around mirror uptime.",
    skills:[
      {name:"Universality: An Elaboration on Form",type:"Elemental Skill",description:"Rushes forward, deals Dendro damage and creates Chisel-Light Mirrors that enable Dendro infusion and Projection Attacks."},
      {name:"Particular Field: Fetters of Phenomena",type:"Elemental Burst",description:"Creates a binding field that deals repeated Dendro damage and interacts with the number of Chisel-Light Mirrors consumed."}
    ]
  },
  {
    slug:"neuvillette",name:"Neuvillette",rarity:5,releaseVersion:"4.1",
    stats:{element:"Hydro",weaponType:"Catalyst",role:"On-field Charged Attack DPS",region:"Fontaine"},
    strengths:["Very strong sustained Hydro damage","Long-range area coverage","Can restore his own HP through Sourcewater Droplets"],
    weaknesses:["Charged Attack can be interrupted without sufficient protection or interruption resistance","Teams should enable Hydro-related reactions for his passive scaling"],
    gameplayNotes:"Generate Sourcewater Droplets with Skill/Burst, absorb them to accelerate his special Charged Attack, and reposition while channeling the Hydro beam.",
    skills:[
      {name:"O Tears, I Shall Repay",type:"Elemental Skill",description:"Deals Hydro area damage and creates Sourcewater Droplets used to accelerate his special Charged Attack."},
      {name:"O Tides, I Have Returned",type:"Elemental Burst",description:"Deals Hydro area damage and creates additional Sourcewater Droplets."}
    ]
  },
  {
    slug:"furina",name:"Furina",rarity:5,releaseVersion:"4.2",
    stats:{element:"Hydro",weaponType:"Sword",role:"Off-field DPS / Buffer",region:"Fontaine"},
    strengths:["Powerful team-wide damage buff","Strong off-field Hydro damage","Can switch Arkhe/alignment mode through Charged Attack"],
    weaknesses:["Fanfare generation benefits greatly from reliable team healing","Her Ousia summons drain party HP above their threshold"],
    gameplayNotes:"Use Salon Solitaire for off-field pressure, then cast her Burst before a healing/damage cycle to build Fanfare and increase team damage.",
    skills:[
      {name:"Salon Solitaire",type:"Elemental Skill",description:"Summons Salon Members or the Singer of Many Waters depending on Furina's current alignment."},
      {name:"Let the People Rejoice",type:"Elemental Burst",description:"Deals Hydro damage and places the party in a state where HP changes build Fanfare, increasing team damage and healing bonuses."}
    ]
  },
  {
    slug:"arlecchino",name:"Arlecchino",rarity:5,releaseVersion:"4.6",
    stats:{element:"Pyro",weaponType:"Polearm",role:"On-field DPS",region:"Fatui"},
    strengths:["Strong Pyro Normal Attack damage","Front-loaded damage windows","Bond of Life mechanic creates a distinctive self-contained rotation"],
    weaknesses:["Cannot normally receive healing from teammates while in combat","Requires careful Bond of Life and Burst management"],
    gameplayNotes:"Apply Blood-Debt Directives with her Skill, wait or resolve them to gain Bond of Life, then use infused Normal Attacks. Her Burst can heal and reset her Skill.",
    skills:[
      {name:"All Is Ash",type:"Elemental Skill",description:"Deals Pyro damage and applies Blood-Debt Directives that can later be consumed to grant Bond of Life."},
      {name:"Balemoon Rising",type:"Elemental Burst",description:"Deals Pyro area damage, clears nearby Blood-Debt Directives, heals Arlecchino and resets her Elemental Skill cooldown."}
    ]
  }
];

export const equipment = [
  ["weapon","Splendor of Tranquil Waters",5,{weaponType:"Sword",secondaryStat:"CRIT DMG"},"Furina's signature sword; its effect interacts with Skill damage and HP changes."],
  ["weapon","Tome of the Eternal Flow",5,{weaponType:"Catalyst",secondaryStat:"CRIT DMG"},"Neuvillette's signature catalyst; its effect supports HP changes and Charged Attack damage."],
  ["weapon","Crimson Moon's Semblance",5,{weaponType:"Polearm",secondaryStat:"CRIT Rate"},"Arlecchino's signature polearm; its effect interacts with Bond of Life."],
  ["weapon","Engulfing Lightning",5,{weaponType:"Polearm",secondaryStat:"Energy Recharge"},"A Burst-focused polearm that converts Energy Recharge into ATK and grants additional Energy Recharge after Burst."],
  ["weapon","A Thousand Floating Dreams",5,{weaponType:"Catalyst",secondaryStat:"Elemental Mastery"},"Nahida's signature catalyst with team and elemental-composition utility."],
  ["weapon","Freedom-Sworn",5,{weaponType:"Sword",secondaryStat:"Elemental Mastery"},"Elemental Mastery sword whose passive can grant team Normal/Charged/Plunging Attack and ATK bonuses."],
  ["weapon","Light of Foliar Incision",5,{weaponType:"Sword",secondaryStat:"CRIT DMG"},"Alhaitham's signature sword; supports infused Normal Attack and Skill damage through Elemental Mastery."],
  ["weapon","Tulaytullah's Remembrance",5,{weaponType:"Catalyst",secondaryStat:"CRIT DMG"},"Wanderer's signature catalyst focused on Normal Attack speed and damage."],
  ["weapon","The Catch",4,{weaponType:"Polearm",secondaryStat:"Energy Recharge"},"Fishing reward polearm that increases Elemental Burst damage and Burst CRIT Rate."],
  ["weapon","Favonius Sword",4,{weaponType:"Sword",secondaryStat:"Energy Recharge"},"Energy Recharge sword that can generate extra particles after CRIT hits."],
  ["weapon","Sacrificial Sword",4,{weaponType:"Sword",secondaryStat:"Energy Recharge"},"Energy Recharge sword with a chance to reset Elemental Skill cooldown."],
  ["weapon","Iron Sting",4,{weaponType:"Sword",secondaryStat:"Elemental Mastery"},"Craftable Elemental Mastery sword with an elemental-damage-triggered damage bonus."],
  ["weapon","Fleuve Cendre Ferryman",4,{weaponType:"Sword",secondaryStat:"Energy Recharge"},"Fontaine fishing reward sword that supports Elemental Skill CRIT Rate and Energy Recharge."],
  ["weapon","Sapwood Blade",4,{weaponType:"Sword",secondaryStat:"Energy Recharge"},"Sumeru craftable sword with Energy Recharge and a Dendro-reaction-based Elemental Mastery support effect."],
  ["weapon","Favonius Lance",4,{weaponType:"Polearm",secondaryStat:"Energy Recharge"},"Energy Recharge polearm that can generate extra particles after CRIT hits."],
  ["weapon","Dragon's Bane",4,{weaponType:"Polearm",secondaryStat:"Elemental Mastery"},"Elemental Mastery polearm that increases damage against enemies affected by Hydro or Pyro."],
  ["weapon","Prototype Amber",4,{weaponType:"Catalyst",secondaryStat:"HP%"},"Craftable HP catalyst that restores Energy and party HP after using an Elemental Burst."],
  ["weapon","The Widsith",4,{weaponType:"Catalyst",secondaryStat:"CRIT DMG"},"Catalyst that grants one of several temporary offensive buffs when the wielder takes the field."],
  ["artifact_set","Emblem of Severed Fate",5,{twoPiece:"Energy Recharge +20%"},"Four-piece bonus increases Elemental Burst damage based on Energy Recharge, up to its listed cap."],
  ["artifact_set","Viridescent Venerer",5,{twoPiece:"Anemo DMG Bonus +15%"},"Four-piece bonus increases Swirl damage and reduces the corresponding elemental resistance of enemies hit by Swirl."],
  ["artifact_set","Deepwood Memories",5,{twoPiece:"Dendro DMG Bonus +15%"},"Four-piece bonus reduces Dendro RES after Skills or Bursts hit enemies."],
  ["artifact_set","Gilded Dreams",5,{twoPiece:"Elemental Mastery +80"},"Four-piece bonus grants ATK and/or Elemental Mastery after triggering elemental reactions based on party elements."],
  ["artifact_set","Golden Troupe",5,{twoPiece:"Elemental Skill DMG +20%"},"Four-piece bonus further increases Elemental Skill damage, with an additional bonus while the wearer is off field."],
  ["artifact_set","Marechaussee Hunter",5,{twoPiece:"Normal and Charged Attack DMG +15%"},"Four-piece bonus grants CRIT Rate stacks when the wearer's HP increases or decreases."],
  ["artifact_set","Fragment of Harmonic Whimsy",5,{twoPiece:"ATK +18%"},"Four-piece bonus increases damage when the wearer's Bond of Life value changes."],
  ["artifact_set","Tenacity of the Millelith",5,{twoPiece:"HP +20%"},"Four-piece bonus can grant party ATK and Shield Strength when an Elemental Skill hits an enemy."],
  ["artifact_set","Noblesse Oblige",5,{twoPiece:"Elemental Burst DMG +20%"},"Four-piece bonus grants a party ATK increase after the wearer uses an Elemental Burst."],
  ["artifact_set","Desert Pavilion Chronicle",5,{twoPiece:"Anemo DMG Bonus +15%"},"Four-piece bonus is activated by Charged Attacks and improves Normal/Charged/Plunging Attack performance."],
  ["artifact_set","Crimson Witch of Flames",5,{twoPiece:"Pyro DMG Bonus +15%"},"Four-piece bonus improves several Pyro-related reaction bonuses and can increase the two-piece effect after using a Skill."]
];

export const materials = [
  ["Agnidus Agate","Character Ascension Gem",5,["Pyro bosses","Alchemy"]],
  ["Varunada Lazurite","Character Ascension Gem",5,["Hydro bosses","Alchemy"]],
  ["Vajrada Amethyst","Character Ascension Gem",5,["Electro bosses","Alchemy"]],
  ["Vayuda Turquoise","Character Ascension Gem",5,["Anemo bosses","Alchemy"]],
  ["Nagadus Emerald","Character Ascension Gem",5,["Dendro bosses","Alchemy"]],
  ["Prithiva Topaz","Character Ascension Gem",5,["Geo bosses","Alchemy"]],
  ["Hero's Wit","Character EXP",4,["Ley Line Outcrop: Blossom of Revelation","Events"]],
  ["Crown of Insight","Talent Material",5,["Limited events","Regional offering systems"]],
  ["Teachings of Resistance","Talent Book",2,["Forsaken Rift: Tue/Fri/Sun"]],
  ["Guide to Resistance","Talent Book",3,["Forsaken Rift: Tue/Fri/Sun"]],
  ["Philosophies of Resistance","Talent Book",4,["Forsaken Rift: Tue/Fri/Sun"]],
  ["Teachings of Gold","Talent Book",2,["Taishan Mansion: Wed/Sat/Sun"]],
  ["Guide to Gold","Talent Book",3,["Taishan Mansion: Wed/Sat/Sun"]],
  ["Philosophies of Gold","Talent Book",4,["Taishan Mansion: Wed/Sat/Sun"]],
  ["Teachings of Light","Talent Book",2,["Violet Court: Wed/Sat/Sun"]],
  ["Guide to Light","Talent Book",3,["Violet Court: Wed/Sat/Sun"]],
  ["Philosophies of Light","Talent Book",4,["Violet Court: Wed/Sat/Sun"]],
  ["Teachings of Praxis","Talent Book",2,["Steeple of Ignorance: Wed/Sat/Sun"]],
  ["Guide to Praxis","Talent Book",3,["Steeple of Ignorance: Wed/Sat/Sun"]],
  ["Philosophies of Praxis","Talent Book",4,["Steeple of Ignorance: Wed/Sat/Sun"]],
  ["Teachings of Equity","Talent Book",2,["Pale Forgotten Glory: Mon/Thu/Sun"]],
  ["Guide to Equity","Talent Book",3,["Pale Forgotten Glory: Mon/Thu/Sun"]],
  ["Philosophies of Equity","Talent Book",4,["Pale Forgotten Glory: Mon/Thu/Sun"]],
  ["Teachings of Justice","Talent Book",2,["Pale Forgotten Glory: Tue/Fri/Sun"]],
  ["Guide to Justice","Talent Book",3,["Pale Forgotten Glory: Tue/Fri/Sun"]],
  ["Philosophies of Justice","Talent Book",4,["Pale Forgotten Glory: Tue/Fri/Sun"]],
  ["Teachings of Order","Talent Book",2,["Pale Forgotten Glory: Wed/Sat/Sun"]],
  ["Guide to Order","Talent Book",3,["Pale Forgotten Glory: Wed/Sat/Sun"]],
  ["Philosophies of Order","Talent Book",4,["Pale Forgotten Glory: Wed/Sat/Sun"]]
];

export const domains = [
  ["domain","Forsaken Rift","Mondstadt","Talent material domain",["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"Freedom (Mon/Thu/Sun), Resistance (Tue/Fri/Sun), Ballad (Wed/Sat/Sun)"],
  ["domain","Taishan Mansion","Liyue","Talent material domain",["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"Prosperity (Mon/Thu/Sun), Diligence (Tue/Fri/Sun), Gold (Wed/Sat/Sun)"],
  ["domain","Violet Court","Inazuma","Talent material domain",["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"Transience (Mon/Thu/Sun), Elegance (Tue/Fri/Sun), Light (Wed/Sat/Sun)"],
  ["domain","Steeple of Ignorance","Sumeru","Talent material domain",["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"Admonition (Mon/Thu/Sun), Ingenuity (Tue/Fri/Sun), Praxis (Wed/Sat/Sun)"],
  ["domain","Pale Forgotten Glory","Fontaine","Talent material domain",["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"Equity (Mon/Thu/Sun), Justice (Tue/Fri/Sun), Order (Wed/Sat/Sun)"],
  ["domain","Momiji-Dyed Court","Inazuma","Artifact domain",["Every day"],"Emblem of Severed Fate; Shimenawa's Reminiscence"],
  ["domain","Spire of Solitary Enlightenment","Sumeru","Artifact domain",["Every day"],"Deepwood Memories; Gilded Dreams"],
  ["domain","Denouement of Sin","Fontaine","Artifact domain",["Every day"],"Golden Troupe; Marechaussee Hunter"],
  ["domain","Faded Theater","Fontaine","Artifact domain",["Every day"],"Fragment of Harmonic Whimsy; Unfinished Reverie"],
  ["domain","Valley of Remembrance","Mondstadt","Artifact domain",["Every day"],"Viridescent Venerer; Maiden Beloved"]
];

export const recommendations = {
  xiangling:[
    ["artifact_set","Emblem of Severed Fate",1,"Common Burst-focused set."],
    ["weapon","The Catch",1,"Strong accessible Energy Recharge option."],
    ["weapon","Dragon's Bane",2,"Useful in reaction teams where Elemental Mastery is valuable."],
    ["main_stats","ER or ATK% / Pyro DMG / CRIT",1,"Exact Energy needs depend on teammates and rotation."],
    ["substats","Energy Recharge → CRIT → ATK% / Elemental Mastery",1,"Prioritize enough Energy Recharge to Burst every rotation."],
    ["talent_priority","Elemental Burst → Elemental Skill",1,"Pyronado is usually the main source of damage."],
    ["team_note","Bennett + Hydro/Cryo/Electro enablers",1,"Xiangling commonly plays from off field in reaction teams."]
  ],
  bennett:[
    ["artifact_set","Noblesse Oblige",1,"Common support set when no teammate already carries it."],
    ["weapon","Sapwood Blade",1,"Accessible high-base-ATK Energy Recharge sword."],
    ["weapon","Favonius Sword",2,"Useful when the team needs additional particles."],
    ["main_stats","ER / HP% / Healing Bonus",1,"Support Bennett normally prioritizes Burst uptime first."],
    ["substats","Energy Recharge → HP%",1,"Damage stats are optional for a pure support build."],
    ["talent_priority","Elemental Burst → Elemental Skill",1,"Burst level improves healing and ATK support."],
    ["team_note","Flexible support slot",1,"Bennett fits many ATK-scaling teams that can remain in his Burst field."]
  ],
  xingqiu:[
    ["artifact_set","Emblem of Severed Fate",1,"Common set for Burst damage and Energy Recharge."],
    ["weapon","Sacrificial Sword",1,"Skill reset can help energy generation."],
    ["weapon","Favonius Sword",2,"Team-friendly Energy Recharge option."],
    ["main_stats","ER or ATK% / Hydro DMG / CRIT",1,"Choose ER sands when needed to maintain Burst uptime."],
    ["substats","Energy Recharge → CRIT → ATK%",1,"Energy requirement changes with constellations, weapon and team."],
    ["talent_priority","Elemental Burst → Elemental Skill",1,"Raincutter drives most off-field contribution."],
    ["team_note","Normal Attack driver + reaction partners",1,"Works especially well when the on-field character uses frequent Normal Attacks."]
  ],
  "kaedehara-kazuha":[
    ["artifact_set","Viridescent Venerer",1,"Core support set for Swirl-based resistance reduction."],
    ["weapon","Freedom-Sworn",1,"Premium Elemental Mastery support option."],
    ["weapon","Iron Sting",2,"Accessible craftable Elemental Mastery option."],
    ["weapon","Favonius Sword",3,"Useful when team Energy is a priority."],
    ["main_stats","Elemental Mastery / Elemental Mastery / Elemental Mastery",1,"Support builds commonly maximize Elemental Mastery after meeting Energy needs."],
    ["substats","Energy Recharge → Elemental Mastery",1,"Ensure Burst uptime if the rotation uses it every cycle."],
    ["talent_priority","Elemental Burst / Elemental Skill",1,"Swirl-focused support damage relies heavily on character level and Elemental Mastery."],
    ["team_note","Elemental carry + matching aura",1,"Swirl the element you want to buff and shred with Viridescent Venerer."]
  ],
  "raiden-shogun":[
    ["artifact_set","Emblem of Severed Fate",1,"Strong fit for her Energy Recharge and Burst-focused kit."],
    ["weapon","Engulfing Lightning",1,"Signature option built around Energy Recharge."],
    ["weapon","The Catch",2,"Excellent accessible Burst-focused option."],
    ["main_stats","ER or ATK% / Electro DMG or ATK% / CRIT",1,"Main stats depend on weapon, buffs and total Energy Recharge."],
    ["substats","CRIT → Energy Recharge → ATK%",1,"Balance Energy Recharge with offensive stats rather than stacking one stat blindly."],
    ["talent_priority","Elemental Burst → Elemental Skill",1,"Burst is the main personal damage and Energy-restoration window."],
    ["team_note","Burst-heavy teammates",1,"Use teammates' Bursts before Raiden to build Resolve."]
  ],
  nahida:[
    ["artifact_set","Deepwood Memories",1,"Usually preferred when the team needs Dendro RES reduction."],
    ["artifact_set","Gilded Dreams",2,"Alternative when another teammate already carries Deepwood."],
    ["weapon","A Thousand Floating Dreams",1,"Signature Elemental Mastery option."],
    ["main_stats","EM / EM or Dendro DMG / EM or CRIT",1,"Exact setup depends on whether Nahida is on field and how much EM the team already provides."],
    ["substats","Elemental Mastery → CRIT → Energy Recharge",1,"Build enough Energy Recharge for the intended Burst frequency."],
    ["talent_priority","Elemental Skill → Elemental Burst",1,"Tri-Karma Purification from the Skill is central to her off-field damage."],
    ["team_note","Quicken / Hyperbloom / Bloom / Burning cores",1,"Mark enemies before triggering Dendro reactions."]
  ],
  wanderer:[
    ["artifact_set","Desert Pavilion Chronicle",1,"Dedicated Anemo on-field attack set."],
    ["weapon","Tulaytullah's Remembrance",1,"Signature Normal Attack-focused catalyst."],
    ["weapon","The Widsith",2,"Accessible CRIT DMG option with rotating offensive buffs."],
    ["main_stats","ATK% / Anemo DMG / CRIT",1,"Standard on-field damage configuration."],
    ["substats","CRIT → ATK% → Energy Recharge",1,"Energy Recharge has lower priority if Burst is not used every rotation."],
    ["talent_priority","Normal Attack → Elemental Skill → Elemental Burst",1,"His Windfavored damage uses enhanced Normal/Charged Attacks."],
    ["team_note","Buffer + shield/interruption resistance",1,"Defensive support makes his airborne damage window easier to maintain."]
  ],
  alhaitham:[
    ["artifact_set","Gilded Dreams",1,"Common offensive set if another teammate provides Deepwood."],
    ["artifact_set","Deepwood Memories",2,"Use when the team otherwise lacks Dendro RES reduction."],
    ["weapon","Light of Foliar Incision",1,"Signature CRIT DMG sword with EM scaling."],
    ["weapon","Iron Sting",2,"Accessible Elemental Mastery option."],
    ["main_stats","Elemental Mastery / Dendro DMG / CRIT",1,"Typical spread for reaction-focused on-field damage."],
    ["substats","CRIT → Elemental Mastery → Energy Recharge / ATK%",1,"Energy needs vary with team and Burst frequency."],
    ["talent_priority","Elemental Skill → Normal Attack → Elemental Burst",1,"Projection Attacks are a major part of his damage."],
    ["team_note","Electro + Dendro core",1,"Quicken/Spread teams are a natural fit; Hyperbloom variants are also common."]
  ],
  neuvillette:[
    ["artifact_set","Marechaussee Hunter",1,"HP fluctuation makes the four-piece CRIT Rate effect easy for him to activate."],
    ["weapon","Tome of the Eternal Flow",1,"Signature Charged Attack catalyst."],
    ["weapon","Prototype Amber",2,"Accessible HP option with Energy and party healing utility."],
    ["main_stats","HP% / Hydro DMG or HP% / CRIT",1,"Choose the goblet based on total stats and available buffs."],
    ["substats","CRIT → HP% → Energy Recharge",1,"Energy Recharge depends on teammates and Burst frequency."],
    ["talent_priority","Normal Attack → Elemental Skill / Burst",1,"His special Charged Attack scales through the Normal Attack talent."],
    ["team_note","Multiple Hydro-related reactions",1,"His passive rewards teams that trigger different Hydro-related reactions."]
  ],
  furina:[
    ["artifact_set","Golden Troupe",1,"Excellent for off-field Elemental Skill damage."],
    ["weapon","Splendor of Tranquil Waters",1,"Signature damage-focused sword."],
    ["weapon","Fleuve Cendre Ferryman",2,"Accessible Energy Recharge option from Fontaine fishing."],
    ["weapon","Favonius Sword",3,"Team-friendly option when Energy is tight."],
    ["main_stats","ER or HP% / HP% or Hydro DMG / CRIT",1,"Use enough Energy Recharge to Burst as often as your rotation requires."],
    ["substats","Energy Recharge to requirement → CRIT → HP%",1,"Her damage scales strongly with HP."],
    ["talent_priority","Elemental Skill → Elemental Burst",1,"Skill drives off-field damage; Burst drives team buffing."],
    ["team_note","Team-wide healer + damage dealers",1,"Frequent party HP changes help build Fanfare quickly."]
  ],
  arlecchino:[
    ["artifact_set","Fragment of Harmonic Whimsy",1,"Designed around Bond of Life changes."],
    ["weapon","Crimson Moon's Semblance",1,"Signature Bond of Life polearm."],
    ["main_stats","ATK% / Pyro DMG / CRIT",1,"Standard on-field Pyro damage configuration."],
    ["substats","CRIT → ATK% → Elemental Mastery (reaction teams)",1,"Elemental Mastery becomes more useful when she consistently triggers reactions."],
    ["talent_priority","Normal Attack → Elemental Skill → Elemental Burst",1,"Normal Attacks are the core of her Bond of Life damage window."],
    ["team_note","Buffer + shielder / reaction enablers",1,"Because external healing is restricted in combat, shielding and careful Burst timing add comfort."]
  ],
  zhongli:[
    ["artifact_set","Tenacity of the Millelith",1,"Common support option when his Stone Stele can maintain the party buff."],
    ["weapon","Favonius Lance",1,"Can add team particle generation if he has enough CRIT Rate to trigger it."],
    ["main_stats","HP% / HP% / HP%",1,"Simple shield-focused setup."],
    ["substats","HP% → Energy Recharge / CRIT (if Favonius)",1,"Pure shield builds mostly care about HP."],
    ["talent_priority","Elemental Skill → Elemental Burst",1,"Level the Skill first for stronger shields."],
    ["team_note","Flexible defensive slot",1,"Useful when interruption resistance and survivability are more important than an additional offensive reaction slot."]
  ]
};
