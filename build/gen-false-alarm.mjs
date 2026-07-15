// Build the "Operation FALSE ALARM" adventure compendium (packs/false-alarm).
// Produces a single Adventure document with inline folders, actors, items,
// journal entries and scenes, then compiles it with foundryvtt-cli.
import { compilePack } from "/Users/timevans/Git/VRPG/foundry/vanity/node_modules/@foundryvtt/foundryvtt-cli/index.mjs";
import fs from "fs";
import path from "path";

const REPO = "/Users/timevans/Git/deltagreen2";
const OUT = "/private/tmp/claude-501/-Users-timevans-Library-Application-Support-FoundryVTT/0078d6e6-126b-4f13-b7f4-86feaf7bfbbc/scratchpad/fasrc";
const PACK = `${REPO}/packs/false-alarm`;
const A = "systems/deltagreen2/assets/adventures/false-alarm";
const STATS = { systemId: "deltagreen2", systemVersion: "2.0.0" };

// deterministic 16-char id
function id(seed) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  let s = "", x = h; const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 16; i++) { x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0; s += c[x % c.length]; }
  return s;
}
const GREEN = "#556b2f";

// ---------------------------------------------------------------- folders
function folder(name, type) {
  return { _id: id(`fa-folder-${type}-${name}`), name, type, folder: null, sort: 0, color: GREEN, description: "", flags: {}, _stats: STATS };
}
const fActors = folder("Operation FALSE ALARM", "Actor");
const fItems = folder("Operation FALSE ALARM", "Item");
const fJournal = folder("Operation FALSE ALARM", "JournalEntry");
const fScenes = folder("Operation FALSE ALARM", "Scene");
const folders = [fActors, fItems, fJournal, fScenes];

// ---------------------------------------------------------------- items
function skillsAllZero() { return {}; } // rely on schema defaults
let itemSort = 0;
function gearItem(name, icon, expense, desc) {
  return {
    _id: id(`fa-item-${name}`), name, type: "gear",
    img: `systems/deltagreen2/assets/icons/${icon}.svg`,
    system: { description: `<p>${desc}</p>`, equipped: false, expense },
    folder: fItems._id, sort: (itemSort += 100), ownership: { default: 0 }, flags: {}, effects: [], _stats: STATS,
  };
}
function weaponItem(name, icon, sys, desc) {
  return {
    _id: id(`fa-item-${name}`), name, type: "weapon",
    img: `systems/deltagreen2/assets/icons/${icon}.svg`,
    system: { description: `<p>${desc}</p>`, skill: "firearms", range: "15M", damage: "1D10", armorPiercing: 0, lethality: 0, isLethal: false, killRadius: "", ammo: 0, ammoMax: 0, expense: "Standard", equipped: false, ...sys },
    folder: fItems._id, sort: (itemSort += 100), ownership: { default: 0 }, flags: {}, effects: [], _stats: STATS,
  };
}
const items = [
  weaponItem("Deputy Vance's Service Pistol", "glock",
    { skill: "firearms", damage: "1D10", ammo: 12, ammoMax: 15, range: "15M" },
    "A .40 S&amp;W duty pistol, found in the cruiser footwell. <b>Three rounds are missing and there are no bullet holes in the car.</b> Whatever he fired at, he fired at outside — or at nothing. Evidence."),
  weaponItem("Heavy Pipe Wrench", "forcible-entry-tool",
    { skill: "melee_weapons", damage: "1D10+2", range: "0M", ammo: 0, ammoMax: 0 },
    "A two-foot steel maintenance wrench. In the Changed Vance's grip it swings with impossible speed. Melee weapon."),
  gearItem("Corrupted Data Drive", "software", "Standard",
    "The radar facility's primary log drive. Its final frames recorded a &#8220;geometric shadow&#8221; hovering over the dish — not an aircraft. <b>Must be wiped or destroyed</b> as part of the cover-up (see the FAA cloud backup). Computer Science to read; SIGINT/Science to analyse the audio."),
  gearItem("Dr. Rostova's Keycard &amp; ID", "papers", "Trivial",
    "FAA contractor credentials for Dr. Elena Rostova, sole on-site technician. Opens the equipment building and the console. Her emergency contact is a sister in Vermont — a loose end for the cover-up."),
  gearItem("Thermite Charge", "anfo", "Unusual",
    "Incendiary supplied for sanitation. Burns hot enough to reduce a frozen body — or a data drive — to slag. Needed to dispose of Dr. Rostova's remains without leaving forensic questions."),
  gearItem("Cold-Weather Field Kit", "camping-gear", "Standard",
    "Parkas, chemical heat packs, headlamps and rope. The dome interior is pitch black and the whole site is well below freezing; Agents without light and warmth accrue penalties over a long night."),
];

// ---------------------------------------------------------------- actors
function npcActor({ key, name, type, img, token, stats, health, skills, notes, shortDescription, san, weapons }) {
  const _id = id(`fa-actor-${key}`);
  const sys = {
    statistics: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, { value: v }])),
    health: { value: health, min: 0, max: health },
    wp: { value: stats.pow, min: 0, max: stats.pow },
    skills: Object.fromEntries(Object.entries(skills || {}).map(([k, v]) => [k, { proficiency: v }])),
    notes, shortDescription, showUntrainedSkills: false,
  };
  if (type === "npc") sys.sanity = { value: san ?? 0, currentBreakingPoint: 101 };
  else sys.sanity = { notes: "", failedLoss: san?.failed ?? "1D4", successLoss: san?.success ?? "1" };
  const embeddedItems = (weapons || []).map((w) => {
    const wid = id(`fa-actor-${key}-wpn-${w.name}`);
    return { _id: wid, _key: `!actors.items!${_id}.${wid}`, name: w.name, type: "weapon",
      img: `systems/deltagreen2/assets/icons/${w.icon}.svg`,
      system: { description: "", skill: w.skill, range: w.range || "0M", damage: w.damage, armorPiercing: w.ap || 0, lethality: w.lethality || 0, isLethal: !!w.lethality, killRadius: "", ammo: w.ammo || 0, ammoMax: w.ammoMax || 0, expense: "Standard", equipped: true } };
  });
  return {
    _id, _key: `!actors!${_id}`, name, type, img,
    system: sys,
    prototypeToken: { name, texture: { src: token, anchorX: 0.5, anchorY: 0.5, fit: "contain", scaleX: 1, scaleY: 1 }, width: 1, height: 1, displayName: 20, disposition: type === "npc" ? 0 : -1, actorLink: false },
    items: embeddedItems, effects: [], folder: fActors._id, sort: 0, ownership: { default: 0 }, flags: {}, _stats: STATS,
  };
}

const aRostova = npcActor({
  key: "rostova", name: "Dr. Elena Rostova", type: "npc",
  img: `${A}/token-rostova.svg`, token: `${A}/token-rostova.svg`,
  stats: { str: 10, con: 10, dex: 11, int: 15, pow: 12, cha: 11 }, health: 10, san: 0,
  skills: { computer_science: 70, science: 0, sigint: 40, first_aid: 30, alertness: 40 },
  shortDescription: "FAA facility technician — deceased, flash-frozen.",
  notes: "<h2>Dr. Elena Rostova (deceased)</h2><p>The facility's sole on-site technician, found slumped over the main console <b>frozen solid</b> despite the room reading roughly 40&deg;F. Her eyes are wide; her lips are torn away from her teeth in a rictus. There is no external cause of death a coroner could accept.</p><p><b>What she knew:</b> She logged the corrupted radar return and played back the final transmission before she died. The audio killed her — or something reached back down it. She is a clue, not a combatant.</p><p><em>Cover-up:</em> her remains must be burned (Thermite Charge) and her FAA records and next-of-kin contact managed.</p>",
});

const aVance = npcActor({
  key: "vance", name: "Deputy Marcus Vance (Changed)", type: "unnatural",
  img: `${A}/token-vance.svg`, token: `${A}/token-vance.svg`,
  stats: { str: 17, con: 16, dex: 16, int: 6, pow: 15, cha: 3 }, health: 16,
  san: { failed: "1D6", success: "1" },
  skills: { alertness: 60, athletics: 70, dodge: 50, melee_weapons: 65, unarmed_combat: 55 },
  shortDescription: "The blinded deputy — no longer entirely human.",
  weapons: [{ name: "Pipe Wrench (frenzied)", icon: "forcible-entry-tool", skill: "melee_weapons", damage: "1D10+2", range: "0M" }],
  notes: "<h2>Deputy Marcus Vance — Changed</h2><p>Six hours ago a small-town deputy. Now he is <b>blind — he gouged out his own eyes</b> — yet moves with terrifying, jerky speed, rewiring the central transmitter by feel to broadcast the static loop at maximum amplification. His jaw unhinges abnormally when he screams: he recites the radar's technical manual <b>backward</b>.</p><h3>Combat</h3><ul><li><b>HP</b> 16 &middot; <b>Wrench</b> 1D10+2, attacks at Melee 65%.</li><li><b>Unnatural speed:</b> acts twice per round; blindness gives him no penalty in the pitch-black dome — the Agents' lights do not help him and do not hinder him.</li><li>He is not trying to kill the Agents. He is trying to <b>finish the broadcast.</b> He only attacks those who interpose.</li></ul><h3>Sanity</h3><p>Witnessing the Changed Vance costs <b>1/1D6 SAN</b>. He can still be dropped by gunfire — he is flesh — but doing so does not stop the transmitter he has already wired.</p>",
});

const aTear = npcActor({
  key: "tear", name: "The Tear (Static Between Stations)", type: "unnatural",
  img: `${A}/token-entity.svg`, token: `${A}/token-entity.svg`,
  stats: { str: 20, con: 30, dex: 20, int: 20, pow: 25, cha: 1 }, health: 30,
  san: { failed: "1D20", success: "1D6" },
  skills: { alertness: 90, dodge: 80 },
  shortDescription: "An extradimensional entity that mimics radio frequencies.",
  notes: "<h2>The Tear &mdash; the Static Between Stations</h2><p>Not a creature so much as a <b>place that should not touch this one</b>: a shifting, non-Euclidean fractal silhouette that bleeds through the centre of the radar dish when the broadcast peaks. The air turns static-charged; hair stands on end; the temperature crashes.</p><h3>Rules</h3><ul><li><b>Firearms are useless.</b> Bullets pass through it and <b>warp out of shape</b>, doing nothing. Do not roll damage.</li><li><b>Presence:</b> being in its manifested presence costs <b>1D6/1D20 SAN</b>. Prolonged exposure (a round overloading the transformer beside it) is the full 1D20 branch.</li><li>It draws humans toward the freezing dark by <b>mimicking frequencies</b> — the corrupted radar return, the sub-carrier voice whispering the Agents' own names.</li></ul><h3>The only resolution: cut the power</h3><p>The tear cannot be fought, only <b>closed</b> by killing the broadcast:</p><ul><li><b>Blow the backup generator outside</b> &mdash; a hazardous run through the dark and snow (Demolitions, or improvised; STR/Athletics to reach it, exposure to Vance en route), or</li><li><b>Manually overload the main transformer inside the dome</b> &mdash; the Agent doing so takes <b>lethal electrical shock</b> (Lethality; survivors are badly hurt) and the full <b>1D6/1D20 SAN</b> exposure to the entity at arm's length.</li></ul><p>When power dies the tear <b>snaps back</b>, and the vacuum <b>implodes the dome.</b></p>",
});
const actors = [aRostova, aVance, aTear];

// ---------------------------------------------------------------- journals
let jSort = 0;
function textPage(name, html, level = 1) {
  return { _id: id(`fa-page-${name}`), name, type: "text", title: { show: true, level },
    text: { format: 1, content: html }, image: {}, video: { controls: true, volume: 0.5 }, src: null,
    system: {}, sort: 0, ownership: { default: -1 }, flags: {}, _stats: STATS };
}
function imagePage(name, src, caption) {
  return { _id: id(`fa-page-img-${name}`), name, type: "image", title: { show: true, level: 1 },
    image: { caption: caption || "" }, text: { format: 1, content: "" }, src, system: {}, sort: 0, ownership: { default: -1 }, flags: {}, _stats: STATS };
}
function journal(key, name, pages) {
  return { _id: id(`fa-journal-${key}`), name, pages: pages.map((p, i) => ({ ...p, sort: (i + 1) * 100 })),
    folder: fJournal._id, sort: (jSort += 100), ownership: { default: 0 }, flags: {}, _stats: STATS,
    _key: undefined };
}

const journal_briefing = journal("01-briefing", "① BRIEFING — Operation FALSE ALARM", [
  imagePage("Operation File", `${A}/cover.svg`, "TOP SECRET // DELTA GREEN — EYES ONLY"),
  textPage("Your Cover &amp; Your Handler",
    "<p>You are federal law-enforcement officers and specialists. Your Delta Green handler in <b>A-Cell</b> has pulled you off the books for the night. Cover story: a joint <b>FAA / NWS</b> team responding to a &#8220;severe weather generator failure&#8221; at a remote automated radar station.</p><p>You were briefed by phone. There was no paperwork. There will be none.</p>"),
  textPage("The Hook",
    "<p>Six hours ago, a standard FAA radar facility in the snowbound wilderness of <b>northern Maine</b> abruptly went offline &mdash; after transmitting a <b>corrupted data loop</b>. A local sheriff's deputy, <b>Marcus Vance</b>, drove out to investigate. He never checked back in.</p>"),
  textPage("The Mission",
    "<ol><li><b>Erase any unnatural data</b> — the facility log and the FAA's remote cloud backups.</li><li><b>Recover or terminate Deputy Vance.</b></li><li><b>Secure the facility.</b></li><li><b>Cover it up</b> as a severe weather-generator failure.</li></ol><p>Time, weather, and whatever is out there are all against you. Runtime: 3&ndash;4 hours.</p>"),
]);

const journal_radar = journal("02-radar", "② HANDOUT — Radar Terminal Log", [
  imagePage("ASR-11 Final Frames", `${A}/handout-radar-log.svg`, "The last thing the dish saw before it crashed."),
  textPage("What it shows",
    "<p>Show players on a <b>Computer Science</b> success accessing the data log. The radar <b>did not track a physical aircraft.</b> It tracked a <b>&#8220;geometric shadow&#8221;</b> that hovered directly over the dish &mdash; no transponder, no altitude, no motion vector &mdash; and then the system crashed into a corrupted loop.</p>"),
]);

const journal_audio = journal("03-audio", "③ HANDOUT — Final Transmission (Audio)", [
  imagePage("Static Capture", `${A}/handout-waveform.svg`, "Rhythmic, oscillating static — a six-second loop."),
  textPage("Listening closely",
    "<p>Playing back the audio from the final transmission (<b>SIGINT</b> or <b>Science</b>) reveals a rhythmic, oscillating static. <b>Listening to it closely requires a Sanity check (0/1D4).</b></p><p>On a success, the listener notices a hidden, low-frequency <b>human voice</b> buried under the static &mdash; whispering the <b>Agents' own names.</b> (Handler: use the players' real character names. Whisper them.)</p>"),
]);

const journal_tear = journal("04-tear", "④ HANDOUT — THE TEAR (climax only)", [
  imagePage("The Manifestation", `${A}/handout-entity.svg`, "DO NOT REVEAL until the broadcast peaks."),
  textPage("Reveal notes",
    "<p><b>Hold this image back</b> until the radar dish activates and the entity bleeds through. The air is static-charged, everyone's hair stands on end, and a shifting, non-Euclidean <b>fractal silhouette</b> tears open at the centre of the dish. Presence costs <b>1D6/1D20 SAN</b>. Bullets pass through and warp uselessly. See <em>GM — NPCs &amp; The Threat</em>.</p>"),
]);

const journal_gm_scenes = journal("05-gm-scenes", "⑤ GM — Scene Guide &amp; Clues", [
  textPage("Scene 1 — The Arrival",
    "<p>A fenced compound: one concrete equipment building and a massive geodesic radar dome over the pines. Heavy snow.</p><ul><li>The outer chain-link fence has been <b>cut from the inside out.</b></li><li><b>Deputy's cruiser</b> by the gate: door wide open, engine dead, interior coated in thick frost. <b>Forensics/Search:</b> his service weapon is in the footwell, <b>missing three rounds &mdash; no bullet holes in the car.</b></li><li><b>Survival/Tracking:</b> footprints lead from the driver's side into the woods, spaced <b>~8 feet apart</b> &mdash; as if sprinting, or dragged in massive strides.</li></ul>"),
  textPage("Scene 2 — The Server Room",
    "<p>The concrete building runs on a failing backup generator that hums unsteadily. <b>Dr. Elena Rostova</b> is dead at the console: <b>frozen solid</b> in a 40&deg;F room, eyes wide, lips torn from her teeth.</p><ul><li><b>Computer Science:</b> the log shows a &#8220;geometric shadow&#8221; over the dish, not an aircraft (Handout ②).</li><li><b>SIGINT/Science:</b> the final transmission is oscillating static. Listening closely = <b>SAN 0/1D4</b>; success hears a voice whispering the Agents' names (Handout ③).</li></ul>"),
  textPage("Scene 3 — The Radar Dome",
    "<p>The upper catwalk inside the dome is pitch black, reeking of <b>ozone and scorched copper</b>. <b>Deputy Vance is here</b> — blind, self-mutilated, frantically rewiring the transmitter to broadcast the static loop at maximum amplification.</p><ul><li>He is <b>no longer entirely human</b>: unhinged jaw, jerky speed, screaming the tech manual backward. Witnessing him = <b>1/1D6 SAN</b>.</li><li>If interposed, he attacks with a heavy wrench (see <em>GM — NPCs</em>).</li></ul>"),
  textPage("The Climax — The Broadcast",
    "<p>Whether Vance succeeds or the Agents trigger it during the fight, the dish activates, spins wildly, and projects a beam of invisible localised EM radiation. <b>The Tear</b> bleeds through (Handout ④).</p><p>It cannot be shot. To close it, <b>cut the primary power</b> — blow the backup generator outside, or manually overload the main transformer inside (lethal shock + <b>1D6/1D20 SAN</b>). When power dies, the tear snaps back and the vacuum <b>implodes the dome.</b></p>"),
]);

const journal_gm_threat = journal("06-gm-threat", "⑥ GM — NPCs &amp; The Threat", [
  textPage("Dr. Elena Rostova", aRostova.system.notes),
  textPage("Deputy Marcus Vance (Changed)", aVance.system.notes),
  textPage("The Tear", aTear.system.notes),
]);

const journal_gm_after = journal("07-gm-after", "⑦ GM — Cover-Up &amp; Aftermath", [
  textPage("Loose ends",
    "<ul><li><b>Burn</b> the frozen remains of Dr. Rostova (Thermite Charge) and manage her FAA record and next of kin.</li><li><b>Stage the cruiser</b> as a horrific wildlife attack or a vehicular accident.</li><li><b>Wipe the FAA's remote cloud backups</b> (Computer Science) as well as the on-site drive.</li><li>The imploded dome sells the &#8220;catastrophic weather-generator failure&#8221; on its own — if nothing contradicts it.</li></ul>"),
  textPage("Sanity rewards",
    "<p>Eliminating the threat grants <b>+1D4 SAN</b>, minus any losses from collateral damage or a failed cover-up. An Agent who overloaded the transformer by hand carries the worst of it — if they lived.</p>"),
]);

const journalArr = [journal_briefing, journal_radar, journal_audio, journal_tear, journal_gm_scenes, journal_gm_threat, journal_gm_after]
  .map((j) => { delete j._key; return j; });

// ---------------------------------------------------------------- scenes
function gridCfg() { return { type: 1, size: 100, style: "solidLines", thickness: 1, color: "#59ff87", alpha: 0.12, distance: 5, units: "ft" }; }
function sceneToken(actor, x, y, hidden = false) {
  const tid = id(`fa-tok-${actor._id}-${x}-${y}`);
  return { _id: tid, name: actor.name, actorId: actor._id, actorLink: false,
    texture: { src: actor.prototypeToken.texture.src, anchorX: 0.5, anchorY: 0.5, scaleX: 1, scaleY: 1, fit: "contain" },
    x, y, width: 1, height: 1, hidden, disposition: actor.prototypeToken.disposition, displayName: 20,
    sight: { enabled: false }, sort: 0, flags: {} };
}
function scene(key, name, bg, w, h, tokens, notesFlag) {
  return {
    _id: id(`fa-scene-${key}`), name, active: false, navigation: true, navName: "",
    width: w, height: h, padding: 0.25, background: { src: `${A}/${bg}` }, foreground: null,
    grid: gridCfg(), initial: { x: Math.round(w / 2), y: Math.round(h / 2), scale: 0.5 },
    backgroundColor: "#050708", tokenVision: false, fogExploration: false, globalLight: true, darkness: 0,
    tokens, walls: [], lights: [], sounds: [], templates: [], notes: [], drawings: [], tiles: [],
    folder: fScenes._id, sort: 0, ownership: { default: 0 }, flags: {}, _stats: STATS,
  };
}
const scenes = [
  scene("1-arrival", "Scene 1 — The Arrival (Compound)", "map-compound.svg", 2600, 1800, []),
  scene("2-server", "Scene 2 — The Server Room", "map-server-room.svg", 1800, 1400, [sceneToken(aRostova, 900, 780)]),
  scene("3-dome", "Scene 3 — The Radar Dome", "map-radar-dome.svg", 2000, 2000,
    [sceneToken(aVance, 1000, 1000), sceneToken(aTear, 1000, 1000, true)]),
];

// ---------------------------------------------------------------- adventure
const advId = id("fa-adventure-false-alarm");
const adventure = {
  _id: advId, _key: `!adventures!${advId}`,
  name: "Operation FALSE ALARM",
  img: `${A}/cover.svg`,
  caption: "A tight 3–4 hour Delta Green shotgun scenario — a remote Maine radar station, and the static between stations.",
  description: "<h2>Operation FALSE ALARM</h2><p>A remote automated FAA radar station in snowbound northern Maine has gone dark after transmitting a corrupted data loop, and the deputy who went to look never came back. An extradimensional entity is mimicking radio frequencies, drawing humans into the freezing dark.</p><p><b>Importing this adventure</b> creates four <em>Operation FALSE ALARM</em> folders — Actors, Items, Journals and Scenes. Start players in the <b>① Briefing</b> journal; run the three scenes in order; keep the GM journals (⑤⑥⑦) for yourself. Handout ④ (The Tear) is for the climax only.</p><p><em>3–4 hours · 4–6 Agents.</em></p>",
  sort: 0, folder: null,
  folders, actors, items, journal: journalArr, scenes,
  cards: [], playlists: [], tables: [], macros: [], combats: [],
  flags: {}, _stats: STATS,
};

// ---------------------------------------------------------------- compile
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "operation-false-alarm.json"), JSON.stringify(adventure, null, 2));
fs.rmSync(PACK, { recursive: true, force: true });
await compilePack(OUT, PACK, { yaml: false });
console.log(`Compiled adventure: ${actors.length} actors, ${items.length} items, ${journalArr.length} journals, ${scenes.length} scenes, ${folders.length} folders.`);
