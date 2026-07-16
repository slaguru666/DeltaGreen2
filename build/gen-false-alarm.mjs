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
  gearItem("Elias Corliss's Ham Handset", "walkie-talkie", "Trivial",
    "A 1970s hand microphone on a worn leather strap, wired to nothing. Agnes Corliss has carried it since her husband died at his radio bench in 1988. <b>The Tear speaks to her through it</b> &mdash; it is the anchor of the Chorus. Destroying it (called shot &minus;20%, 6 HP) or taking it from her silences the static and frees the Called. Afterward it is inert &mdash; but at 3 a.m. it is very slightly cold to the touch."),
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
  img: `${A}/token-rostova.png`, token: `${A}/token-rostova.png`,
  stats: { str: 10, con: 10, dex: 11, int: 15, pow: 12, cha: 11 }, health: 10, san: 0,
  skills: { computer_science: 70, science: 0, sigint: 40, first_aid: 30, alertness: 40 },
  shortDescription: "FAA facility technician — deceased, flash-frozen.",
  notes: "<h2>Dr. Elena Rostova (deceased)</h2><p>The facility's sole on-site technician, found slumped over the main console <b>frozen solid</b> despite the room reading roughly 40&deg;F. Her eyes are wide; her lips are torn away from her teeth in a rictus. There is no external cause of death a coroner could accept.</p><p><b>What she knew:</b> She logged the corrupted radar return and played back the final transmission before she died. The audio killed her — or something reached back down it. She is a clue, not a combatant.</p><p><em>Cover-up:</em> her remains must be burned (Thermite Charge) and her FAA records and next-of-kin contact managed.</p>",
});

const aVance = npcActor({
  key: "vance", name: "Deputy Marcus Vance (Changed)", type: "unnatural",
  img: `${A}/token-vance.png`, token: `${A}/token-vance.png`,
  stats: { str: 17, con: 16, dex: 16, int: 6, pow: 15, cha: 3 }, health: 16,
  san: { failed: "1D6", success: "1" },
  skills: { alertness: 60, athletics: 70, dodge: 50, melee_weapons: 65, unarmed_combat: 55 },
  shortDescription: "The blinded deputy — no longer entirely human.",
  weapons: [{ name: "Pipe Wrench (frenzied)", icon: "forcible-entry-tool", skill: "melee_weapons", damage: "1D10+2", range: "0M" }],
  notes: "<h2>Deputy Marcus Vance — Changed</h2><p>Six hours ago a small-town deputy. Now he is <b>blind — he gouged out his own eyes</b> — yet moves with terrifying, jerky speed, rewiring the central transmitter by feel to broadcast the static loop at maximum amplification. His jaw unhinges abnormally when he screams: he recites the radar's technical manual <b>backward</b>.</p><h3>Combat</h3><ul><li><b>HP</b> 16 &middot; <b>Wrench</b> 1D10+2, attacks at Melee 65%.</li><li><b>Unnatural speed:</b> acts twice per round; blindness gives him no penalty in the pitch-black dome — the Agents' lights do not help him and do not hinder him.</li><li>He is not trying to kill the Agents. He is trying to <b>finish the broadcast.</b> He only attacks those who interpose.</li></ul><h3>Sanity</h3><p>Witnessing the Changed Vance costs <b>1/1D6 SAN</b>. He can still be dropped by gunfire — he is flesh — but doing so does not stop the transmitter he has already wired.</p>",
});

const aTear = npcActor({
  key: "tear", name: "The Tear (Static Between Stations)", type: "unnatural",
  img: `${A}/token-entity.png`, token: `${A}/token-entity.png`,
  stats: { str: 20, con: 30, dex: 20, int: 20, pow: 25, cha: 1 }, health: 30,
  san: { failed: "1D20", success: "1D6" },
  skills: { alertness: 90, dodge: 80 },
  shortDescription: "An extradimensional entity that mimics radio frequencies.",
  notes: "<h2>The Tear &mdash; the Static Between Stations</h2><p>Not a creature so much as a <b>place that should not touch this one</b>: a shifting, non-Euclidean fractal silhouette that bleeds through the centre of the radar dish when the broadcast peaks. The air turns static-charged; hair stands on end; the temperature crashes.</p><h3>Rules</h3><ul><li><b>Firearms are useless.</b> Bullets pass through it and <b>warp out of shape</b>, doing nothing. Do not roll damage.</li><li><b>Presence:</b> being in its manifested presence costs <b>1D6/1D20 SAN</b>. Prolonged exposure (a round overloading the transformer beside it) is the full 1D20 branch.</li><li>It draws humans toward the freezing dark by <b>mimicking frequencies</b> — the corrupted radar return, the sub-carrier voice whispering the Agents' own names.</li></ul><h3>The only resolution: cut the power</h3><p>The tear cannot be fought, only <b>closed</b> by killing the broadcast:</p><ul><li><b>Blow the backup generator outside</b> &mdash; a hazardous run through the dark and snow (Demolitions, or improvised; STR/Athletics to reach it, exposure to Vance en route), or</li><li><b>Manually overload the main transformer inside the dome</b> &mdash; the Agent doing so takes <b>lethal electrical shock</b> (Lethality; survivors are badly hurt) and the full <b>1D6/1D20 SAN</b> exposure to the entity at arm's length.</li></ul><p>When power dies the tear <b>snaps back</b>, and the vacuum <b>implodes the dome.</b></p>",
});
// ---- Midpoint encounter: The Congregation ----

const aAgnes = npcActor({
  key: "agnes", name: "Agnes Corliss, the Switchboard Widow", type: "unnatural",
  img: `${A}/token-agnes.png`, token: `${A}/token-agnes.png`,
  stats: { str: 8, con: 12, dex: 9, int: 14, pow: 18, cha: 16 }, health: 10,
  san: { failed: "1D6", success: "1" },
  skills: { alertness: 55, occult: 40, persuade: 60, sigint: 50 },
  shortDescription: "The Tear speaks through her dead husband's handset.",
  notes: "<h2>Agnes Corliss &mdash; the Switchboard Widow (78)</h2><p>Great-granddaughter of the town's founders. Her husband Elias died at his ham bench in 1988, headphones on, tuned to the ridge. Agnes has listened every night since &mdash; and three months ago, <b>the ridge started answering in Elias's voice.</b> She believes the broadcast is heaven. She has been gathering the weak-willed of Corliss Notch to &#8220;hear the call.&#8221; Tonight she has brought them to meet it.</p><h3>Combat &mdash; she does not fight. She RULES the fight.</h3><ul><li><b>HP 10, WP 18.</b> Physically frail. <b>The Chorus Protects:</b> while any Called or Returned is conscious within 10 m, attacks against Agnes suffer &minus;20% (they lurch into the line of fire).</li><li><b>THE CHORUS (free action, every round):</b> layered static pours from her open mouth and from every radio, phone and earpiece the Agents carry. All who hear it: <b>SAN 0/1D4 on first exposure, then 0/1 per further round</b>; &minus;20% to any concentration-based test while it sustains. Agents who ditch comms and plug their ears reduce this to first-exposure only.</li><li><b>STAND STILL (action):</b> she speaks one Agent's true name <i>backward</i>. Opposed test: her POW&times;5 (90%) vs the target's POW&times;5. Fail: the Agent <b>loses their next action</b>, standing slack. Critical fail: they also drop what they hold.</li><li><b>SPEAK THE NAMES (once per Agent per night):</b> she recites something private &mdash; a Bond's name, a buried guilt (Handler: mine the Agent's Bonds). Target: <b>SAN 0/1D4.</b></li></ul><h3>Weakness &mdash; CUT THE FEED</h3><p>The Chorus anchors through <b>Elias's handset</b> on her belt (called shot &minus;20%, 6 HP, or a successful grapple to snatch it). Destroy or take it &mdash; or deafen her (flash-bang) &mdash; and the Chorus dies: Stand Still drops to 45%, the Called wake, and Agnes collapses into a confused, weeping old woman asking where Elias has gone. <b>She is a victim.</b> What A-Cell does with her afterward is the Handler's knife to twist.</p><p><em>SAN to witness the Chorus in a dead loved one's voice: 1/1D6.</em></p>",
});

const aDale = npcActor({
  key: "dale", name: "Dale Petrie, Returned", type: "unnatural",
  img: `${A}/token-returned-dale.png`, token: `${A}/token-returned-dale.png`,
  stats: { str: 17, con: 16, dex: 12, int: 7, pow: 12, cha: 4 }, health: 17,
  san: { failed: "1D6", success: "1" },
  skills: { alertness: 50, athletics: 60, melee_weapons: 60, unarmed_combat: 55, swim: 70 },
  shortDescription: "Ten weeks drowned. Walking anyway.",
  weapons: [
    { name: "Boat Hook", icon: "forcible-entry-tool", skill: "melee_weapons", damage: "1D8+2", range: "0M" },
    { name: "Grasp of the Drowned", icon: "unarmed", skill: "unarmed_combat", damage: "1D6+1", range: "0M" },
  ],
  notes: "<h2>Dale Petrie &mdash; Returned (was 41)</h2><p>The elder of the vanished hunters. Ten weeks at the bottom of Cold Cauldron Pond, and now he stands at its edge, soaked and patient, holding the boat hook he went in with. The Tear kept the shape and threw away most of the man.</p><h3>Combat (each brother)</h3><ul><li><b>HP 17. Frost-hardened flesh: 3 points armor</b> &mdash; cold meat doesn't tear. Ignores stun, pain and fear.</li><li><b>Boat Hook</b> 60%, 1D8+2. <b>Grasp of the Drowned</b> 55%, 1D6+1 &mdash; on a hit the limb seized goes numb: <b>&minus;20% to the target's DEX-based tests next round.</b></li><li><b>Cold radius:</b> Agents within 3 m for 3+ consecutive rounds: CON&times;5 or 1 HP from the cold.</li><li><b>COLD CAULDRON BAPTISM:</b> if BOTH brothers grapple one Agent, they drag them toward the pond &mdash; 2 rounds to the shore, then under the thin ice. Drowning and freezing, simultaneously. This is what they came to do: <b>the pond is how the Tear tastes people.</b></li></ul><h3>Weaknesses</h3><ul><li><b>Fire/thermite: double damage</b>, and an open flame makes both brothers flinch back one step.</li><li>An Agent who shouts their names with a successful <b>HUMINT</b> roll makes one brother hesitate a full round (once per brother). Something in there remembers being called in for supper.</li></ul><p><em>SAN to see one clearly: 1/1D6.</em></p>",
});

const aRoy = npcActor({
  key: "roy", name: "Roy Petrie, Returned", type: "unnatural",
  img: `${A}/token-returned-roy.png`, token: `${A}/token-returned-roy.png`,
  stats: { str: 18, con: 16, dex: 11, int: 6, pow: 12, cha: 4 }, health: 17,
  san: { failed: "1D6", success: "1" },
  skills: { alertness: 45, athletics: 60, melee_weapons: 60, unarmed_combat: 55, swim: 70 },
  shortDescription: "The younger brother. He hums the broadcast now.",
  weapons: [
    { name: "Splitting Maul", icon: "wood-axe", skill: "melee_weapons", damage: "1D10+2", range: "0M" },
    { name: "Grasp of the Drowned", icon: "unarmed", skill: "unarmed_combat", damage: "1D6+1", range: "0M" },
  ],
  notes: "<h2>Roy Petrie &mdash; Returned (was 38)</h2><p>The younger, bigger brother. One eye is frozen shut; his jaw hangs; from somewhere inside him comes the six-second static loop, humming, over and over. He carries the splitting maul from his own woodpile.</p><p><b>Use Dale's stat block</b> &mdash; identical rules, except: <b>Splitting Maul</b> 60%, 1D10+2 (slower, meaner). Roy always moves toward whoever is LOUDEST &mdash; gunfire, shouting, a radio squawk. Handler note: point him at the Agent doing the most talking.</p><p>Armor 3 (frost-hardened flesh) &middot; fire = double damage &middot; HUMINT name-call makes him hesitate once &middot; Baptism drag with Dale &middot; SAN 1/1D6.</p>",
});

const aCalled = npcActor({
  key: "called", name: "The Called (Notch townsfolk)", type: "npc",
  img: `${A}/token-called.png`, token: `${A}/token-called.png`,
  stats: { str: 11, con: 11, dex: 10, int: 10, pow: 10, cha: 10 }, health: 11, san: 40,
  skills: { alertness: 30, athletics: 30, unarmed_combat: 40 },
  shortDescription: "Five entranced neighbours. They are crying while they do it.",
  notes: "<h2>The Called &mdash; five townsfolk of Corliss Notch</h2><p>Cody Aldous (17, deleted the livestream), Ruth the diner cook, Whit Emmons the trapper, and the Pelletier couple from the feed store. They stand in the snow in their nightclothes and hunting jackets, faces upturned, <b>humming the six-second loop in unison.</b> Look closely (<b>HUMINT 40%</b>): they are weeping while they hum. They are prisoners in their own bodies.</p><h3>Combat &mdash; they are a wall, not an army</h3><ul><li>Use this one actor for all five (HP 11 each; track hits).</li><li><b>They do not kill. They RESTRAIN:</b> grapple at 40%, working in pairs (+20% for the second). A held Agent is carried toward Agnes &mdash; or the pond.</li><li>While the Chorus sustains they are immune to Persuade and feel no fear.</li><li><b>Pain wakes them a little:</b> any damage dealt to one grants it a POW&times;5 test each round to shake free of the trance.</li><li><b>When the Chorus dies</b> (handset destroyed/taken, Agnes deafened or down): they ALL wake at once &mdash; five terrified, hypothermic civilians in a firefight.</li></ul><h3>The cost</h3><p><b>Killing one of the Called costs the shooter 1/1D8 SAN</b> &mdash; they are innocent &mdash; and hands the cover-up (journal &#9451;) a body that cannot be blamed on weather. The Handler should make the easy trigger-pull expensive.</p>",
});

const actors = [aRostova, aVance, aTear, aAgnes, aDale, aRoy, aCalled];

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

const journal_briefing = journal("01-briefing", "① OPERATIONAL BRIEFING", [
  imagePage("A-Cell Operations Directive", `${A}/hd-briefing-memo.svg`, "Hand this to the players. TOP SECRET // GALVANIZE // NOFORN."),
  textPage("Your Cover &amp; Your Handler",
    "<p>You are federal law-enforcement officers and specialists. Your Delta Green handler in <b>A-Cell</b> &mdash; callsign <b>&#8220;Provost&#8221;</b> &mdash; has pulled you off the books for the night. Cover story: a joint <b>FAA / NWS</b> team responding to a &#8220;severe weather-generator failure&#8221; at a remote automated radar station in the North Maine Woods.</p><p>You were briefed by phone. There was no paperwork. There will be none. The county has been told a specialist team is inbound and will not interfere.</p>"),
  textPage("The Hook",
    "<p>At <b>0312 local</b>, FAA long-range radar <b>Site ME-07 (&#8220;Sable Ridge&#8221;)</b> transmitted a <b>corrupted data loop</b> and went dark. It will not answer a remote reboot. Aroostook County deputy <b>Marcus Vance</b> drove up at about 0500 to investigate. He never checked back in.</p><p>A-Cell is interested because the pre-crash frames logged a contact that is <em>not consistent with any aircraft.</em></p>"),
  textPage("The Mission",
    "<ol><li><b>Erase any unnatural data</b> &mdash; the on-site log drive <em>and</em> the FAA's remote cloud backups.</li><li><b>Recover or terminate Deputy Vance.</b></li><li><b>Secure the facility.</b></li><li><b>Cover it up</b> as a severe weather-generator failure.</li></ol><p>Weapons discreet. No local casualties that can't be blamed on weather or wildlife. If an Agent is compromised by what's on that ridge, the mission comes first. Runtime: 3&ndash;4 hours.</p>"),
  textPage("Signal &amp; The Weather",
    "<p>Cellular dies about three miles up the Ridge Road. You have encrypted VHF, callsign <b>OUTLAW-6</b>. <b>If your radios begin to answer you, stop transmitting.</b></p><p>Heavy snow tonight; lows to &minus;18&deg;F on high ground; the road is impassable by dawn. Whatever you're going to do, do it before first light.</p>"),
]);

const journal_site = journal("02-site", "② THE SITE — FAA Sable Ridge", [
  imagePage("Site Fact Sheet (ME-07)", `${A}/hd-site-dossier.svg`, "Attachment A. Player-facing."),
  textPage("What the site is",
    "<p><b>FAA Site ME-07 &#8220;Sable Ridge&#8221;</b> is an automated <b>ARSR-4 long-range air-route surveillance radar</b> &mdash; a joint FAA / USAF / NWS installation filling a coverage gap over the Canadian border approaches. It sits at 2,140 ft on an exposed ridge in the North Maine Woods, fourteen gravel miles up the Ridge Road from the nearest village.</p><p>It is <b>unmanned.</b> A contractor (Sygnal Dynamics LLC) services it four times a year. Nobody lives within nine miles. Grid power with a diesel backup generator; a satellite uplink; no cellular. A single chain-link compound holds one concrete equipment building and the geodesic radar dome.</p>"),
  textPage("Why it matters here",
    "<p>The ridge had a reputation long before the radar. Trappers avoided it; compasses spin near the summit; the old settler families say it &#8220;answers whistles.&#8221; When the FAA automated the site in <b>2016</b> and left a high-power transmitter running unattended on that ridge, ham operators started logging a faint rhythmic carrier on quiet nights &mdash; &#8220;the Sable hum.&#8221;</p><p>About fourteen months ago the site's own self-diagnostics began logging <b>phantom returns</b>: contacts with no transponder and no motion vector that vanish between sweeps. The FAA called it receiver noise and, eventually, sent a technician. See <em>&#9314; The Area</em> and <em>&#9317; Recent Activity</em>.</p>"),
]);

const journal_area = journal("03-area", "③ THE AREA — Corliss Notch &amp; the North Woods", [
  imagePage("Regional Map", `${A}/hd-regional-map.svg`, "Attachment B. Player-facing."),
  textPage("Corliss Notch, Maine",
    "<p>An unincorporated village of about <b>310 people</b> in Aroostook County, at the edge of the North Maine Woods. A general store with the only gas for forty miles, the <b>Notch Diner</b>, a Grange hall, a white Congregational church, a volunteer fire department, and a two-deputy <b>sheriff's substation</b> that Marcus Vance runs mostly alone.</p><p>It is a logging-and-trapping town losing its young people. Everyone knows everyone. Strangers are noticed &mdash; your cover will be tested at the diner if you stop. The town is fourteen miles and a locked winter gate from the ridge.</p>"),
  textPage("The land &amp; the cold",
    "<p>Dense spruce and fir, frozen bogs, and <b>Cold Cauldron Pond</b> below the ridge &mdash; a deep, spring-fed pond that &#8220;never quite freezes right,&#8221; locals say. This winter is the hardest in forty years; the almanac calls it a record cold snap. Around Sable Ridge the temperature runs colder still, in a way the weather service can't explain.</p><p>The Ridge Road is gravel, gated in winter, and yours to open. Past mile three there is no cell signal, no houses, and no help.</p>"),
  textPage("Local legend (GM colour)",
    "<p>Old-timers call the ridge <b>&#8220;the Whistle.&#8221;</b> The stories are consistent across a century: the ridge <b>answers</b> &mdash; a whistle, a shout, later a radio &mdash; and if you answer it back, and keep answering, it draws you off into the cold. An 1888 hunting diary in the Grange archive records a party that &#8220;followed a voice they took for a lost man&#8221; and lost two of their own. In 1978 a USGS survey team abandoned a cabin on the ridge after &#8220;equipment fouling&#8221; and one member's breakdown; the report was buried. Locals don't talk about it to outsiders. They just don't go up there after dark.</p>"),
]);

const journal_activity = journal("04-activity", "④ RECENT ACTIVITY — Pattern of Events", [
  imagePage("The Aroostook County Ledger", `${A}/hd-newspaper.svg`, "Attachment C. This week's local paper &mdash; hand to players."),
  imagePage("Pattern of Activity", `${A}/hd-timeline.svg`, "Attachment D. The escalation, years to hours."),
  textPage("What has been happening",
    "<p>Read the timeline (Attachment D) and the county paper (Attachment C) as the record of a curve that is steepening. In plain terms, working backward from tonight:</p><ul><li><b>Years:</b> the ridge's old reputation; the &#8220;Sable hum&#8221; after automation in 2016; a 1978 survey team that fled.</li><li><b>~14 months:</b> the first phantom returns on the radar &mdash; the thing beginning to look back down the beam.</li><li><b>~3 months (autumn):</b> livestock and pets found &#8220;frozen through&#8221; with no wounds &mdash; one dog solid in a heated barn. Radio &#8220;bleed&#8221; grows; operators say the static answers them, and twice repeated a name.</li><li><b>~10 weeks:</b> the <b>Petrie brothers</b> vanish near Cold Cauldron Pond, truck running, radio tuned to static. Never found.</li><li><b>~6 weeks:</b> FAA schedules the service call. A teenager livestreams &#8220;breathing static&#8221; from the road, then deletes it.</li><li><b>~2 weeks:</b> Dr. Rostova arrives; her calls home turn strange &mdash; the array is &#8220;receiving more than it transmits.&#8221; The cold deepens around the dome.</li><li><b>~4 days:</b> Deputy Vance, rattled after a welfare check, calls the site over and over.</li><li><b>~18 hours:</b> the corrupted loop; the site goes dark.</li><li><b>~6 hours &mdash; now:</b> Vance drives up alone. Silence. You are activated.</li></ul>"),
]);

const journal_persons = journal("05-persons", "⑤ PERSONS OF INTEREST", [
  imagePage("Vance &amp; Rostova", `${A}/hd-personnel.svg`, "Attachment E. Player-facing dossiers."),
  textPage("Deputy Marcus Vance, 34",
    "<p>Aroostook County deputy, a Corliss Notch native and an <b>Army signals veteran</b> &mdash; which may be exactly why the thing on the ridge could reach him: he speaks radio. Steady, well-liked, nine years on the county, running the one-man Notch substation.</p><p>He logged four welfare checks on the Ridge Road this month. Dispatch marked him &#8220;rattled&#8221; after the last, when a trucker's CB &#8220;said his kids' names.&#8221; He called the site repeatedly the day it went dark, then drove up alone. <b>Recover him if you can</b> &mdash; he is a local hero, and his body cannot simply vanish.</p>"),
  textPage("Dr. Elena Rostova, 41",
    "<p>FAA contract field engineer (Sygnal Dynamics LLC), fifteen years on remote arrays. Meticulous, skeptical, not a fanciful woman. Sent up two weeks ago to clear the site's recurring &#8220;phantom return&#8221; fault.</p><p>Her early calls home were routine. Then, per her sister in Vermont, she grew &#8220;off,&#8221; saying the array was <b>&#8220;receiving more than it transmits&#8221;</b> and the readings &#8220;don't make sense in three dimensions.&#8221; Last contact four days ago. <b>Her work notes are a priority recovery;</b> sanitize the contract trail behind her.</p>"),
]);

const journal_radar = journal("06-radar", "⑥ HANDOUT — Radar Terminal Log", [
  imagePage("ASR-11 Final Frames", `${A}/handout-radar-log.svg`, "The last thing the dish saw before it crashed."),
  textPage("What it shows",
    "<p>Show players on a <b>Computer Science</b> success accessing the data log. The radar <b>did not track a physical aircraft.</b> It tracked a <b>&#8220;geometric shadow&#8221;</b> that hovered directly over the dish &mdash; no transponder, no altitude, no motion vector &mdash; and then the system crashed into a corrupted loop.</p>"),
]);

const journal_audio = journal("07-audio", "⑦ HANDOUT — Final Transmission (Audio)", [
  imagePage("Static Capture", `${A}/handout-waveform.svg`, "Rhythmic, oscillating static — a six-second loop."),
  textPage("Listening closely",
    "<p>Playing back the audio from the final transmission (<b>SIGINT</b> or <b>Science</b>) reveals a rhythmic, oscillating static. <b>Listening to it closely requires a Sanity check (0/1D4).</b></p><p>On a success, the listener notices a hidden, low-frequency <b>human voice</b> buried under the static &mdash; whispering the <b>Agents' own names.</b> (Handler: use the players' real character names. Whisper them.)</p>"),
]);

const journal_tear = journal("08-tear", "⑧ HANDOUT — THE TEAR (climax only)", [
  imagePage("The Manifestation", `${A}/handout-entity.svg`, "DO NOT REVEAL until the broadcast peaks."),
  textPage("Reveal notes",
    "<p><b>Hold this image back</b> until the radar dish activates and the entity bleeds through. The air is static-charged, everyone's hair stands on end, and a shifting, non-Euclidean <b>fractal silhouette</b> tears open at the centre of the dish. Presence costs <b>1D6/1D20 SAN</b>. Bullets pass through and warp uselessly. See <em>GM — NPCs &amp; The Threat</em>.</p>"),
]);

const journal_gm_scenes = journal("09-gm-scenes", "⑨ GM — Scene Guide &amp; Clues", [
  textPage("Scene 1 — The Arrival",
    "<p>A fenced compound: one concrete equipment building and a massive geodesic radar dome over the pines. Heavy snow.</p><ul><li>The outer chain-link fence has been <b>cut from the inside out.</b></li><li><b>Deputy's cruiser</b> by the gate: door wide open, engine dead, interior coated in thick frost. <b>Forensics/Search:</b> his service weapon is in the footwell, <b>missing three rounds &mdash; no bullet holes in the car.</b></li><li><b>Survival/Tracking:</b> footprints lead from the driver's side into the woods, spaced <b>~8 feet apart</b> &mdash; as if sprinting, or dragged in massive strides.</li></ul>"),
  textPage("Scene 2 — The Server Room",
    "<p>The concrete building runs on a failing backup generator that hums unsteadily. <b>Dr. Elena Rostova</b> is dead at the console: <b>frozen solid</b> in a 40&deg;F room, eyes wide, lips torn from her teeth.</p><ul><li><b>Computer Science:</b> the log shows a &#8220;geometric shadow&#8221; over the dish, not an aircraft (Handout ②).</li><li><b>SIGINT/Science:</b> the final transmission is oscillating static. Listening closely = <b>SAN 0/1D4</b>; success hears a voice whispering the Agents' names (Handout ③).</li></ul>"),
  textPage("Scene 2.5 — MIDPOINT: The Congregation",
    "<p>Between the server room and the dome, the town comes up the mountain. When the Agents step back outside &mdash; or drive for the dome &mdash; <b>headlights crest the Ridge Road at mile 9</b>, and under the wind they hear it: a dozen human voices <b>humming the six-second static loop in unison.</b></p><p>Full encounter, map, and stat blocks: journal <b>&#9452; GM &mdash; MIDPOINT: The Congregation</b>. Run it before Scene 3; it is the operation's turn from investigation to horror.</p>"),
  textPage("Scene 3 — The Radar Dome",
    "<p>The upper catwalk inside the dome is pitch black, reeking of <b>ozone and scorched copper</b>. <b>Deputy Vance is here</b> — blind, self-mutilated, frantically rewiring the transmitter to broadcast the static loop at maximum amplification.</p><ul><li>He is <b>no longer entirely human</b>: unhinged jaw, jerky speed, screaming the tech manual backward. Witnessing him = <b>1/1D6 SAN</b>.</li><li>If interposed, he attacks with a heavy wrench (see <em>GM — NPCs</em>).</li></ul>"),
  textPage("The Climax — The Broadcast",
    "<p>Whether Vance succeeds or the Agents trigger it during the fight, the dish activates, spins wildly, and projects a beam of invisible localised EM radiation. <b>The Tear</b> bleeds through (Handout ④).</p><p>It cannot be shot. To close it, <b>cut the primary power</b> — blow the backup generator outside, or manually overload the main transformer inside (lethal shock + <b>1D6/1D20 SAN</b>). When power dies, the tear snaps back and the vacuum <b>implodes the dome.</b></p>"),
]);

const journal_gm_threat = journal("10-gm-threat", "⑩ GM — NPCs &amp; The Threat", [
  textPage("Dr. Elena Rostova", aRostova.system.notes),
  textPage("Deputy Marcus Vance (Changed)", aVance.system.notes),
  textPage("The Tear", aTear.system.notes),
]);

const journal_gm_truth = journal("11-gm-truth", "⑪ GM — The Truth (What's Really Happening)", [
  textPage("The static between stations",
    "<p>The entity has no name and no shape a human keeps. Think of it as a <b>place adjacent to this one</b> that perceives and moves through <b>resonance</b> &mdash; frequency, rhythm, the act of a signal answered by a signal. It has brushed against Sable Ridge for as long as anyone has records: the spinning compasses, the ridge that &#8220;answers,&#8221; the hunters who followed a voice. For most of history it could only whisper, and only to those who whistled back.</p>"),
  textPage("Why now — the beacon",
    "<p>In 2016 the FAA left a <b>high-power radar transmitter running unattended</b> on the one ridge that had always half-listened. Years of steady transmission gave the entity a <b>stable channel</b> &mdash; a doorway propped a little further open every night. The &#8220;phantom returns&#8221; the diagnostics logged were it <b>looking back down the beam.</b> The frozen animals, the radio that answers, the Petrie brothers drawn onto the ice &mdash; that is it learning to reach through and feed, pulling warmth and living things into the cold on the other side.</p>"),
  textPage("Rostova, Vance, and the doorway",
    "<p>Dr. Rostova's servicing <b>tightened the coupling</b> &mdash; she tuned the array and, without knowing it, tuned the door. The corrupted data loop was the entity <b>learning to speak in our signal.</b> It took her first (flash-frozen at the console, the cold bleeding backward through the channel). Then it reached down <b>Deputy Vance's radio</b> &mdash; the one man for miles who spoke fluent signal &mdash; and remade him into an <b>instrument</b>: blind him so nothing distracts, and set him rewiring the transmitter to broadcast the lure at full power and <b>open the way completely.</b></p><p>This is why every layer of the timeline connects: folklore, the hum, the phantom returns, the deaths, the technician, the deputy. It has been one slow inhale. Tonight it exhales.</p>"),
  textPage("How it ends",
    "<p>The tear cannot be fought &mdash; only <b>starved of signal.</b> Cut the primary power (blow the outside generator, or overload the dome transformer by hand at lethal cost) and the channel collapses: the entity snaps back and the vacuum implodes the dome. If the Agents <b>fail</b>, the broadcast completes, the doorway holds open, and Sable Ridge becomes a permanent cold spot that swallows the Notch over the following winter &mdash; a much larger Delta Green problem, later.</p>"),
]);

const journal_midpoint = journal("13-gm-midpoint", "⑬ GM — MIDPOINT: The Congregation", [
  imagePage("Cold Cauldron Crossing", `${A}/map-crossing.svg`, "Ridge Road, mile 9 — the battle map is in the Scenes folder."),
  textPage("The Setup",
    "<p>The broadcast has been calling Corliss Notch for weeks &mdash; the hum, the radio that answers, the names. Tonight, as the transmitter nears full power, the most susceptible finally <b>answered</b>. <b>Agnes Corliss</b>, who has heard her dead husband in the static for months, has led five entranced neighbours up the Ridge Road to &#8220;meet the call.&#8221; And at Cold Cauldron Pond, the Tear has sent up what it kept: <b>the Petrie brothers.</b></p><p><b>Trigger:</b> run this when the Agents leave the equipment building for the dome (or try to drive back down). A jackknifed log truck blocks the road at mile 9; vehicles cluster with doors open, engines running; six figures stand in a circle in the snow, faces upturned, humming. The pond glimmers to the south. <b>Read-aloud:</b></p><blockquote><p><i>The snow parts around them like they've been standing there an hour. Old Agnes Corliss stands at the centre in her nightcoat, one hand pressing a dead man's radio handset to her ear. Without turning, she says your point-man's name &mdash; first, middle, last &mdash; in a voice that is not hers. From the pond shore, two big men in soaked hunting jackets begin to walk up the bank. They have been dead for ten weeks, and they are smiling like they're late for supper.</i></p></blockquote>"),
  textPage("The Opposition",
    "<p>Four actor sheets in the FALSE ALARM folder carry the full rules:</p><ul><li><b>Agnes Corliss, the Switchboard Widow</b> &mdash; the control piece. The Chorus (rolling SAN drain + concentration penalties through every radio the Agents carry), Stand Still (name spoken backward = lose an action), Speak the Names (weaponized Bonds). Frail &mdash; but screened by everyone else.</li><li><b>Dale &amp; Roy Petrie, Returned</b> &mdash; the muscle. Armor 3, ignore pain, boat hook and splitting maul, numbing grasp, and the <b>Baptism</b>: grappled Agents get dragged under the pond ice. Fire is doubled against them.</li><li><b>The Called</b> (&times;5) &mdash; the wall, and the moral trap. They grapple, restrain and carry; they never kill; they are crying while they do it. Killing one is 1/1D8 SAN and a cover-up catastrophe.</li></ul><p><b>Balance note (4 Agents):</b> this is deliberately unwinnable as a straight shootout &mdash; ~34 effective HP of armored Returned plus five bodies the Agents must not shoot, while Agnes strips actions and SAN. The door out is the <b>handset</b>.</p>"),
  textPage("Running It — tactics, outs, aftermath",
    "<p><b>Round order of intent:</b> the Called advance to restrain; the Returned make for whoever resists hardest (Roy goes for the loudest); Agnes stands still and takes Agents apart with words. Anyone dragged to the pond has 2 rounds before they go under.</p><p><b>Ways to win that aren't massacre:</b></p><ul><li><b>Cut the feed:</b> destroy or snatch Elias's handset (called shot &minus;20%, 6 HP, or grapple Agnes). Chorus dies, the Called wake, the Returned stop mid-stride &mdash; then turn and walk back into the pond.</li><li><b>Deafen her:</b> a flash-bang inside 10 m silences the Chorus for good.</li><li><b>Names:</b> HUMINT + shouting a Petrie's name buys a round per brother. Enough rounds to run.</li><li><b>Run the gauntlet:</b> ram past the log truck (Drive &minus;20% in snow). The Congregation follows &mdash; slowly, on foot, uphill, humming. They arrive at the compound for the climax if not dealt with.</li></ul><p><b>Aftermath:</b> freed Called remember everything as a dream of &#8220;the most beautiful voice.&#8221; Waking all five alive: <b>+1 SAN each Agent.</b> Agnes, if freed, keeps asking where Elias went &mdash; and once, flatly, in the wrong voice: <i>&#8220;IT IS ALMOST DONE LEARNING OUR SHAPE.&#8221;</i> That is the players' warning for Scene 3. Every civilian death here becomes a named problem in &#9451; Cover-Up.</p>"),
]);

const journal_gm_after = journal("12-gm-after", "⑫ GM — Cover-Up &amp; Aftermath", [
  textPage("Loose ends",
    "<ul><li><b>Burn</b> the frozen remains of Dr. Rostova (Thermite Charge) and manage her FAA record and next of kin (the sister in Vermont).</li><li><b>Stage the cruiser</b> as a horrific wildlife attack or a vehicular accident. Recover Vance's body if at all possible &mdash; the Notch will search for its deputy.</li><li><b>Wipe the FAA's remote cloud backups</b> (Computer Science) as well as the on-site drive.</li><li>The imploded dome sells the &#8220;catastrophic weather-generator failure&#8221; on its own &mdash; if nothing contradicts it. Loose talk in Corliss Notch is the real threat to the cover.</li></ul>"),
  textPage("Sanity rewards",
    "<p>Eliminating the threat grants <b>+1D4 SAN</b>, minus any losses from collateral damage or a failed cover-up. An Agent who overloaded the transformer by hand carries the worst of it &mdash; if they lived. If the broadcast completed and the Agents ran, no reward: the ridge is still open, and A-Cell will be back.</p>"),
]);

const journalArr = [
  journal_briefing, journal_site, journal_area, journal_activity, journal_persons,
  journal_radar, journal_audio, journal_tear,
  journal_gm_scenes, journal_gm_threat, journal_gm_truth, journal_gm_after,
  journal_midpoint,
].map((j) => { delete j._key; return j; });

// ---------------------------------------------------------------- scenes
function gridCfg() { return { type: 1, size: 200, style: "solidLines", thickness: 1, color: "#59ff87", alpha: 0.10, distance: 5, units: "ft" }; }
function sceneToken(actor, x, y, hidden = false) {
  const tid = id(`fa-tok-${actor._id}-${x}-${y}`);
  // x/y are the CENTER of the intended map position (scenes use padding 0,
  // so map pixels === scene coordinates); token docs store the top-left.
  return { _id: tid, name: actor.name, actorId: actor._id, actorLink: false,
    texture: { src: actor.prototypeToken.texture.src, anchorX: 0.5, anchorY: 0.5, scaleX: 1, scaleY: 1, fit: "contain" },
    x: x - 100, y: y - 100, width: 1, height: 1, hidden, disposition: actor.prototypeToken.disposition, displayName: 20,
    sight: { enabled: false }, sort: 0, flags: {} };
}
function scene(key, name, bg, w, h, tokens, notesFlag) {
  return {
    _id: id(`fa-scene-${key}`), name, active: false, navigation: true, navName: "",
    width: w, height: h, padding: 0, background: { src: `${A}/${bg}` }, foreground: null,
    grid: gridCfg(), initial: { x: Math.round(w / 2), y: Math.round(h / 2), scale: 0.5 },
    backgroundColor: "#050708", tokenVision: false, fogExploration: false, globalLight: true, darkness: 0,
    tokens, walls: [], lights: [], sounds: [], templates: [], notes: [], drawings: [], tiles: [],
    folder: fScenes._id, sort: 0, ownership: { default: 0 }, flags: {}, _stats: STATS,
  };
}
// Maps are 2x PNGs (200 px / 5-ft square) so they stay crisp when zoomed in.
const scenes = [
  scene("1-arrival", "Scene 1 — The Arrival (Compound)", "map-compound.png", 5200, 3600, []),
  scene("2-server", "Scene 2 — The Server Room", "map-server-room.png", 3600, 2800, [sceneToken(aRostova, 1800, 1560)]),
  scene("25-crossing", "Scene 2.5 — Cold Cauldron Crossing", "map-crossing.png", 4400, 3200, [
    sceneToken(aAgnes, 2900, 1240),
    sceneToken(aCalled, 2740, 1100), sceneToken(aCalled, 3070, 1140), sceneToken(aCalled, 2900, 1430),
    sceneToken(aCalled, 2680, 1330), sceneToken(aCalled, 3100, 1350),
    sceneToken(aDale, 3120, 2100), sceneToken(aRoy, 3280, 2170),
  ]),
  scene("3-dome", "Scene 3 — The Radar Dome", "map-radar-dome.png", 4000, 4000,
    [sceneToken(aVance, 2000, 2000), sceneToken(aTear, 2000, 2000, true)]),
];

// ---------------------------------------------------------------- adventure
const advId = id("fa-adventure-false-alarm");
const adventure = {
  _id: advId, _key: `!adventures!${advId}`,
  name: "Operation FALSE ALARM",
  img: `${A}/cover.svg`,
  caption: "A tight 3–4 hour Delta Green shotgun scenario — a remote Maine radar station, and the static between stations.",
  description: "<h2>Operation FALSE ALARM</h2><p>A remote automated FAA radar station in snowbound northern Maine has gone dark after transmitting a corrupted data loop, and the deputy who went to look never came back. An extradimensional entity is mimicking radio frequencies, drawing humans into the freezing dark.</p><p><b>Importing this adventure</b> creates four <em>Operation FALSE ALARM</em> folders — Actors, Items, Journals and Scenes.</p><p><b>Journals ①–⑤</b> are the players' intelligence packet — a full A-Cell briefing with six document handouts (operational memo, site fact sheet, regional map, the local newspaper, an activity timeline, and personnel dossiers) plus setting write-ups on the site, the town of Corliss Notch, and the years-long escalation. <b>⑥–⑧</b> are the in-scene handouts (radar log, static transmission, the Tear — climax only). <b>⑨–⑫</b> are GM-only: scene clues, NPC/threat rules, the truth of what's happening, and the cover-up.</p><p>Run the three scenes in order. <em>3–4 hours · 4–6 Agents.</em></p>",
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
