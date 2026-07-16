/**
 * Delta Green 2 home rule — critical events.
 *
 * A natural 01 on any percentile test triggers PROVIDENCE: a d6 roll on an
 * escalating table of boons (1 = a small mercy, 6 = the whole cell benefits).
 * A natural 00 (100) triggers CALAMITY: a d6 roll on an escalating table of
 * misfortunes (1 = bad but not crippling, 6 = everyone at the table pays).
 *
 * Events are announced with a dramatic chat card; the Handler applies the
 * mechanical effects. Toggled by the `criticalEvents` automation setting.
 */
import { tagRollDice } from "../integrations/dice-so-nice.js";

const PROVIDENCE = [
  {
    title: "A MOMENT OF CLARITY",
    text: "For one impossible second, the world makes sense. The static in the Agent's head goes quiet. <b>Recover 1D4 SAN.</b>",
  },
  {
    title: "MUSCLE MEMORY",
    text: "Training the Agent forgot they had takes over completely. <b>Mark this skill for improvement</b> as if it had been earned the hard way &mdash; and it costs nothing tonight.",
  },
  {
    title: "ADRENALINE EDGE",
    text: "Time dilates. Every detail is crystal. The Agent gains <b>+20% to their next test this scene</b>, any skill.",
  },
  {
    title: "THE PROGRAM PROVIDES",
    text: "Against all odds, exactly the right thing is at hand &mdash; a spare magazine, a working flashlight, a door someone forgot to lock. <b>Recover 1D4 WP and gain +20% to the Agent's next test this scene.</b>",
  },
  {
    title: "UNTOUCHABLE",
    text: "Tonight, the dark looks elsewhere. <b>The next attack or hazard that would harm the Agent this scene misses, glances off, or simply&hellip; doesn't.</b>",
  },
  {
    title: "THE CELL IN PERFECT SYNC",
    text: "One flawless action locks the whole team into rhythm &mdash; hand signals, breath, heartbeat. <b>Every Agent in the scene recovers 1 WP and gains +20% to their next test.</b> For a moment, Delta Green is winning.",
  },
];

const CALAMITY = [
  {
    title: "EQUIPMENT FAILURE",
    text: "The tool betrays its owner &mdash; the weapon jams, the lockpick snaps, the radio dies mid-word. <b>The item used is fouled or broken until repaired or reloaded.</b> Bad. Not crippling. Yet.",
  },
  {
    title: "BLOOD ON THE SNOW",
    text: "A misstep, a torn seam, an edge in the dark. <b>The Agent takes 1D4 damage</b> &mdash; nothing fatal, but it will be felt for the rest of the night.",
  },
  {
    title: "RATTLED",
    text: "The failure gets inside. Hands shake; the checklist scatters. <b>The Agent loses 1D4 WP and takes &minus;20% on their next test this scene.</b>",
  },
  {
    title: "SOMETHING NOTICED",
    text: "In the wake of the blunder there is a pause &mdash; the sense of an ear turning. <b>The Agent makes a SAN test (0/1D4).</b> Whatever is out there now knows one of their names.",
  },
  {
    title: "THE PRICE IS PAID IN FULL",
    text: "Everything that could go wrong, does, at once. <b>The Agent takes 1D6 damage AND their equipped item is dropped or broken.</b> Somewhere, quietly, a door that was closed is now open.",
  },
  {
    title: "IT SEES ALL OF YOU",
    text: "The failure tears something open, and for a heartbeat every Agent stands in the light of it. <b>Everyone in the scene loses 0/1D4 SAN and takes &minus;20% on their next test.</b> Radios whisper. Lights gutter. It knows the cell exists.",
  },
];

/**
 * Check an evaluated percentile roll for a natural 01 / 00 and, if the
 * home rule is enabled and the roller is an Agent, post the event card.
 *
 * @param {DGPercentileRoll} roll - the evaluated roll (post-toChat).
 * @returns {Promise<ChatMessage|null>}
 */
export async function maybeTriggerCriticalEvent(roll) {
  try {
    if (!game.settings.get("deltagreen2", "criticalEvents")) return null;
    if (roll.actor?.type !== "agent") return null;
    if (roll.total !== 1 && roll.total !== 100) return null;

    const providence = roll.total === 1;
    const d6 = new Roll("1d6");
    await d6.evaluate();
    tagRollDice(d6, providence ? "dg2-agency" : "dg2-unnatural");
    const entry = (providence ? PROVIDENCE : CALAMITY)[d6.total - 1];

    const actorName = roll.actor?.name ?? "The Agent";
    const rollName = roll.localizedKey ?? "the test";

    const strip = providence
      ? { type: "PROVIDENCE — NATURAL 01", cls: "dg2-msg-providence", icon: "fa-star-of-life" }
      : { type: "CALAMITY — NATURAL 00", cls: "dg2-msg-calamity", icon: "fa-radiation" };

    const lede = providence
      ? `For one impossible moment, everything breaks <i>${actorName}'s</i> way on <b>${rollName}</b>.`
      : `On <b>${rollName}</b>, the night turns on <i>${actorName}</i>.`;

    const content = `
      <div class="dg2-card dg2-crit-event">
        <div class="dg2-card-strip">
          <span class="dg2-card-type">${strip.type}</span>
          <span class="dg2-card-org">${game.i18n.localize("DG2.Chat.EyesOnly")}</span>
        </div>
        <div class="dg2-card-title">
          <span class="dg2-card-name">${entry.title}</span>
          <span class="dg2-chip"><i class="fas fa-dice-d6"></i> ${d6.total} / 6</span>
        </div>
        <p class="dg2-crit-lede">${lede}</p>
        <p class="dg2-crit-text">${entry.text}</p>
      </div>`;

    return await ChatMessage.create({
      content,
      rolls: [d6],
      sound: CONFIG.sounds.dice,
      speaker: ChatMessage.getSpeaker({ actor: roll.actor }),
      flags: { deltagreen2: { variant: providence ? "providence" : "calamity" } },
    });
  } catch (ex) {
    console.warn("Delta Green 2 | critical event failed", ex);
    return null;
  }
}
