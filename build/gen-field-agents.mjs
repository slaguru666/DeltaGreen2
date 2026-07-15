import { extractPack, compilePack } from "/Users/timevans/Git/VRPG/foundry/vanity/node_modules/@foundryvtt/foundryvtt-cli/index.mjs";
import fs from "fs";
import path from "path";

const REPO = "/Users/timevans/Git/deltagreen2";
const OUT_SRC = "/private/tmp/claude-501/-Users-timevans-Library-Application-Support-FoundryVTT/0078d6e6-126b-4f13-b7f4-86feaf7bfbbc/scratchpad/agentsrc";
const PACK = `${REPO}/packs/field-agents`;
const PLACEHOLDER = "systems/deltagreen2/assets/icons/person-black-bg.svg";

// Deterministic id from seed.
function id(seed) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  let s = "", x = h; const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 16; i++) { x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0; s += chars[x % chars.length]; }
  return s;
}

// Load weapon templates from the firearms pack.
const wtmp = `${OUT_SRC}/_firearms`;
fs.rmSync(OUT_SRC, { recursive: true, force: true });
fs.mkdirSync(wtmp, { recursive: true });
await extractPack(`${REPO}/packs/firearms`, wtmp, { yaml: false });
const firearms = fs.readdirSync(wtmp).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(`${wtmp}/${f}`, "utf8")));
function weapon(name, ownerSeed) {
  const w = firearms.find(x => x.name === name);
  if (!w) throw new Error(`weapon not found: ${name}`);
  const o = structuredClone(w);
  delete o._key;
  o._id = id(`${ownerSeed}-wpn-${name}`);
  return o;
}
function unarmed(ownerSeed) {
  return {
    _id: id(`${ownerSeed}-unarmed`), name: "Unarmed Attack", type: "weapon",
    img: "systems/deltagreen2/assets/icons/unarmed.svg",
    system: { skill: "unarmed_combat", range: "0M", damage: "1D4", armorPiercing: 0, lethality: 0, isLethal: false, ammo: 0, ammoMax: 0, expense: "Standard", description: "" },
  };
}
function bond(ownerSeed, name, relationship, score) {
  return {
    _id: id(`${ownerSeed}-bond-${name}`), name, type: "bond",
    img: "systems/deltagreen2/assets/icons/person-black-bg.svg",
    system: { score, relationship, description: "", hasBeenDamagedSinceLastHomeScene: false },
  };
}

// ---- The eight agents ----
// combat tier noted for reference; all can fight (firearms >= 40).
const AGENTS = [
  {
    name: "SITKA, MARCUS", token: "agent-operator",
    profession: "Special Operator", employer: "U.S. Army (det.) / Delta Green", nationality: "American", sex: "Male", age: "38", education: "Ranger School; SFQC",
    stats: { str: 15, con: 15, dex: 16, int: 11, pow: 13, cha: 10 },
    skills: { firearms: 80, unarmed_combat: 70, melee_weapons: 60, dodge: 60, athletics: 70, alertness: 60, demolitions: 40, heavy_weapons: 50, stealth: 55, survival: 55, first_aid: 45, navigate: 45, search: 40 },
    typed: [{ label: "Explosives", group: "Military Science", proficiency: 50 }],
    weapons: ["Submachine Gun (SMG)", "Heavy Pistol"],
    bonds: [["Ex-wife (Karen Sitka)", "Ex-spouse", 11], ["Ranger buddy (SFC Dale Voss)", "Brother-in-arms", 13]],
    bio: "Twenty years in the Regiment and then Delta before a burn notice he never got the paperwork for. Sitka is the man the cell puts on point when the door has to come down hard. He talks little, watches everything, and has already run the worst-case in his head before anyone else has drawn a weapon. What he saw on his last sanctioned deployment is the reason a man from the Program bought him a coffee and told him the truth.",
    combat: "Elite",
  },
  {
    name: "HOLLOWAY, DIANA", token: "agent-marine",
    profession: "Force Recon Marine", employer: "USMC (Reserve)", nationality: "American", sex: "Female", age: "34", education: "Recon; MARSOC selection",
    stats: { str: 16, con: 15, dex: 13, int: 11, pow: 12, cha: 11 },
    skills: { firearms: 70, unarmed_combat: 60, melee_weapons: 55, dodge: 45, athletics: 60, heavy_weapons: 50, alertness: 50, survival: 45, navigate: 45, swim: 60, first_aid: 40, search: 40 },
    typed: [{ label: "Air", group: "Military Science", proficiency: 40 }],
    weapons: ["Rifle (Light)", "Medium Pistol"],
    bonds: [["Father (Gunnery Sgt. Ray Holloway, ret.)", "Parent", 12], ["Fire team leader (Sgt. Ana Reyes)", "Comrade", 12]],
    bio: "Holloway carries the load nobody else can and never mentions it. A career Marine from a Marine family, she reads terrain and threat by instinct and keeps her people moving when things come apart. She is the cell's spine in a firefight. Privately she keeps a running count of the things that walked away from wounds that should have stopped them, and the number is getting hard to explain.",
    combat: "Heavy",
  },
  {
    name: "VANCE, THEODORE", token: "agent-fed",
    profession: "FBI Special Agent", employer: "Federal Bureau of Investigation", nationality: "American", sex: "Male", age: "41", education: "J.D.; FBI Academy",
    stats: { str: 13, con: 12, dex: 13, int: 13, pow: 12, cha: 13 },
    skills: { firearms: 60, unarmed_combat: 50, melee_weapons: 40, dodge: 40, alertness: 50, criminology: 60, law: 50, humint: 50, persuade: 50, search: 50, bureaucracy: 50, drive: 45, first_aid: 40 },
    typed: [],
    weapons: ["Medium Pistol"],
    bonds: [["Wife (Ellen Vance)", "Spouse", 13], ["Field office partner (SA Marcus Doyle)", "Partner", 12]],
    bio: "Twelve years working violent crime and public corruption made Vance a patient, methodical investigator who can also put ten rounds center-mass under stress. He runs the cell's interviews and its paper trail, and he is the one who signs the reports that keep everyone out of a cell. He believes in the rule of law. He is beginning to suspect the law has no statutes for what he now investigates.",
    combat: "Strong",
  },
  {
    name: "ROURKE, BERNADETTE", token: "agent-detective",
    profession: "Homicide Detective", employer: "Metropolitan Police Dept.", nationality: "American", sex: "Female", age: "44", education: "B.A. Criminology; PD academy",
    stats: { str: 12, con: 12, dex: 13, int: 12, pow: 13, cha: 12 },
    skills: { firearms: 55, unarmed_combat: 50, melee_weapons: 40, dodge: 40, alertness: 55, criminology: 50, humint: 45, persuade: 40, search: 55, drive: 50, first_aid: 40, occult: 20 },
    typed: [],
    weapons: ["Medium Pistol"],
    bonds: [["Son (Danny Rourke, 16)", "Child", 14], ["Old partner (Det. Sal Ferro, ret.)", "Mentor", 11]],
    bio: "Twenty-two years and a wall of closed cases, Rourke has stood over more bodies than she can name and learned to read a room in a heartbeat. She is stubborn, sharp, and quietly furious about the ones that got away. Two of those cold cases share details she has never been able to file — details that Delta Green recognized the moment she said them aloud.",
    combat: "Good",
  },
  {
    name: "ELLARD, JONAH", token: "agent-medic",
    profession: "Emergency Physician", employer: "County Trauma Center", nationality: "American", sex: "Male", age: "36", education: "M.D.; combat casualty care",
    stats: { str: 12, con: 13, dex: 13, int: 14, pow: 12, cha: 11 },
    skills: { firearms: 45, unarmed_combat: 40, dodge: 35, alertness: 45, first_aid: 70, medicine: 60, surgery: 50, pharmacy: 55, search: 40, science: 0, drive: 40 },
    typed: [{ label: "Biology", group: "Science", proficiency: 45 }],
    weapons: ["Medium Pistol"],
    bonds: [["Sister (Dr. Naomi Ellard)", "Sibling", 12], ["Charge nurse (Whitney Cole)", "Colleague", 11]],
    bio: "Ellard has kept people alive in trauma bays and once in the back of a moving truck with a flashlight in his teeth. He is the reason wounded Agents come home. He can hold a pistol steady and will if he must, but his hands were trained to close wounds, not open them. Some of what has come through his ER lately did not match any pathology he was taught, and he kept the samples.",
    combat: "Moderate",
  },
  {
    name: "KAPLAN, SIMONE", token: "agent-intel",
    profession: "Intelligence Case Officer", employer: "Central Intelligence Agency (NOC)", nationality: "American", sex: "Female", age: "37", education: "M.A. International Relations; the Farm",
    stats: { str: 11, con: 12, dex: 14, int: 14, pow: 13, cha: 14 },
    skills: { firearms: 50, unarmed_combat: 45, dodge: 45, alertness: 50, stealth: 60, humint: 60, persuade: 55, disguise: 45, sigint: 40, search: 40, bureaucracy: 40, drive: 45 },
    typed: [{ label: "Arabic", group: "Foreign Language", proficiency: 50 }, { label: "Russian", group: "Foreign Language", proficiency: 40 }],
    weapons: ["Light Pistol"],
    bonds: [["Handler (\"Mr. Okafor\")", "Handler", 11], ["Asset she couldn't save (memory)", "Guilt", 12]],
    bio: "Kaplan has lived under three names on two continents and can walk into a hostile room and walk out with everyone's secrets. She recruits, she deceives, she disappears. She can shoot well enough to break contact and vanish, which is exactly the point. She was read into Delta Green because a network she ran started reporting things her analysts flatly refused to write down.",
    combat: "Moderate",
  },
  {
    name: "MERCER, ELLIOT", token: "agent-scientist",
    profession: "Forensic Scientist", employer: "State Crime Laboratory", nationality: "American", sex: "Male", age: "33", education: "Ph.D. Molecular Biology",
    stats: { str: 10, con: 11, dex: 12, int: 16, pow: 13, cha: 11 },
    skills: { firearms: 40, unarmed_combat: 30, dodge: 35, alertness: 45, computer_science: 55, forensics: 60, first_aid: 30, search: 45, occult: 15, science: 0, pharmacy: 40 },
    typed: [{ label: "Biology", group: "Science", proficiency: 65 }, { label: "Chemistry", group: "Science", proficiency: 55 }],
    weapons: ["Light Pistol"],
    bonds: [["Husband (Peter Mercer)", "Spouse", 13], ["Lab mentor (Dr. Ito)", "Mentor", 11]],
    bio: "Mercer sees the story a scene leaves behind — trace, spatter, sequence — and reads it cold. He is the least dangerous man in the cell with a weapon and the most dangerous with a microscope. He carries a pistol because the others insisted, and he practices, badly, because he has now seen what happens to the people who don't. A tissue sample he could not classify is the reason he stopped sleeping.",
    combat: "Support",
  },
  {
    name: "CALLOWAY, REGINA", token: "agent-pilot",
    profession: "Contract Pilot", employer: "Private aviation / former USAF", nationality: "American", sex: "Female", age: "39", education: "USAF flight school; ATP rating",
    stats: { str: 12, con: 12, dex: 15, int: 13, pow: 12, cha: 12 },
    skills: { firearms: 50, unarmed_combat: 40, dodge: 45, alertness: 50, drive: 50, navigate: 60, heavy_machiner: 45, athletics: 40, first_aid: 40, search: 40, sigint: 30 },
    typed: [{ label: "Aircraft", group: "Pilot", proficiency: 65 }, { label: "Rotary Wing", group: "Pilot", proficiency: 50 }],
    weapons: ["Medium Pistol"],
    bonds: [["Daughter (Mia Calloway, 11)", "Child", 14], ["Wingman (Capt. Joe Brandt)", "Comrade", 11]],
    bio: "Calloway can put an aircraft down on a road at night with the instruments dead, and she has. Cool, precise, and quietly reckless, she is the cell's way in and way out. On the ground she handles a pistol like the trained officer she was. She took a Program contract for the flight pay and the questions nobody would answer, and she is still deciding whether that was the worst mistake of her life.",
    combat: "Moderate",
  },
];

if (AGENTS.length !== 8) { console.error("need 8"); process.exit(1); }

// Base skill defaults so an agent's non-combat skills look like the pregens (partial override on top of schema defaults is fine).
fs.mkdirSync(OUT_SRC, { recursive: true });

let sort = 0;
for (const a of AGENTS) {
  const seed = a.name;
  const _id = id(`dg2-agent-${seed}`);
  const { str, con, dex, int, pow, cha } = a.stats;
  const hp = Math.ceil((str + con) / 2);
  const san = pow * 5;

  // Build skills object (only overrides; DataModel fills the rest with defaults).
  const skills = {};
  for (const [k, v] of Object.entries(a.skills)) {
    if (v > 0) skills[k] = { proficiency: v };
  }
  const typedSkills = {};
  a.typed.forEach((t, i) => {
    typedSkills[`tskill_${String(i + 1).padStart(2, "0")}`] = { label: t.label, group: t.group, proficiency: t.proficiency, failure: false };
  });

  const items = [
    ...a.weapons.map((w) => weapon(w, seed)),
    unarmed(seed),
    ...a.bonds.map(([n, r, s]) => bond(seed, n, r, s)),
  ];
  // Embedded items need a hierarchical compile key: !actors.items!<actorId>.<itemId>
  for (const it of items) {
    it._key = `!actors.items!${_id}.${it._id}`;
  }

  // Use the pencil portrait for both sheet image and token once it exists on disk;
  // otherwise fall back to the neutral placeholder.
  const tokenRel = `assets/tokens/${a.token}.webp`;
  const tokenImg = fs.existsSync(`${REPO}/${tokenRel}`)
    ? `systems/deltagreen2/${tokenRel}`
    : PLACEHOLDER;
  const doc = {
    _id, _key: `!actors!${_id}`, name: a.name, type: "agent",
    img: tokenImg,
    system: {
      statistics: {
        str: { value: str }, con: { value: con }, dex: { value: dex },
        int: { value: int }, pow: { value: pow }, cha: { value: cha },
      },
      health: { value: hp, min: 0, max: hp },
      wp: { value: pow, min: 0, max: pow },
      sanity: { value: san, currentBreakingPoint: san - pow, breakingPointHit: false },
      skills, typedSkills,
      biography: {
        profession: a.profession, employer: a.employer, nationality: a.nationality,
        sex: a.sex, age: a.age, education: a.education,
      },
      physical: { description: `<p>${a.bio}</p><p><em>Combat rating: ${a.combat}.</em></p>` },
    },
    prototypeToken: {
      name: a.name,
      texture: { src: tokenImg, anchorX: 0.5, anchorY: 0.5, fit: "contain", scaleX: 1, scaleY: 1 },
      displayName: 20, actorLink: true, sight: { enabled: true },
    },
    items,
    effects: [],
    folder: null,
    sort: (sort += 1000),
    ownership: { default: 0 },
    flags: { deltagreen2: { plannedToken: tokenImg, combat: a.combat } },
    _stats: { systemId: "deltagreen2", systemVersion: "2.0.0" },
  };

  fs.writeFileSync(path.join(OUT_SRC, `${seed.replace(/[^a-z0-9]+/gi, "_")}_${_id}.json`), JSON.stringify(doc, null, 2));
}

fs.rmSync(wtmp, { recursive: true, force: true });
fs.rmSync(PACK, { recursive: true, force: true });
await compilePack(OUT_SRC, PACK, { yaml: false });
console.log(`Compiled ${AGENTS.length} agents into ${PACK}`);
