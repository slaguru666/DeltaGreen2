import DGUtils from "./utility-functions.js";

/**
 * DG2 chat-card apply actions.
 *
 * Resolves the tokens that damage/sanity loss should be applied to:
 * the user's targets first, then their controlled tokens.
 *
 * @returns {Token[]}
 */
function resolveTargetTokens() {
  const targeted = Array.from(game.user.targets);
  if (targeted.length) return targeted;
  return canvas?.tokens?.controlled ?? [];
}

/**
 * Whisper an application summary to the GM (and the applying user).
 *
 * @param {string} content - HTML content of the whisper.
 */
async function whisperGM(content) {
  const gmIds = game.users.filter((u) => u.isGM).map((u) => u.id);
  const whisper = [...new Set([...gmIds, game.user.id])];
  await ChatMessage.create({
    content,
    whisper,
    speaker: { alias: "Delta Green 2" },
  });
}

/**
 * Guard helper - can the current user update this actor?
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
function canModify(actor) {
  if (actor.canUserModify(game.user, "update")) return true;
  ui.notifications.warn(
    `${game.user.name} does not have permission to modify ${actor.name}.`,
  );
  return false;
}

/**
 * Apply HP damage to targeted/selected tokens, subtracting armor
 * protection (reduced by the weapon's armor-piercing value).
 *
 * @param {Object} options
 * @param {number} options.damage - the rolled damage total.
 * @param {number} [options.ap] - armor piercing value of the source weapon.
 */
export async function applyDamageToTargets({ damage, ap = 0 }) {
  const tokens = resolveTargetTokens();
  if (!tokens.length) {
    ui.notifications.warn(
      DGUtils.localizeWithFallback(
        "DG2.Apply.NoTarget",
        "Target or select a token first.",
      ),
    );
    return;
  }

  for (const token of tokens) {
    const { actor } = token;
    if (!actor?.system?.health || !canModify(actor)) continue;

    const protection = Math.max(
      0,
      (actor.system.health.protection ?? 0) - Math.max(0, ap),
    );
    const applied = Math.max(0, damage - protection);
    const oldHP = actor.system.health.value;
    const newHP = Math.max(0, oldHP - applied);

    // eslint-disable-next-line no-await-in-loop
    await actor.update({ "system.health.value": newHP });

    const armorNote = protection
      ? ` (${damage} &minus; ${protection} armor${ap ? `, AP ${ap}` : ""})`
      : "";
    // eslint-disable-next-line no-await-in-loop
    await whisperGM(
      `<b>${actor.name}</b> takes <b>${applied}</b> damage${armorNote}. HP ${oldHP} &rarr; ${newHP}.${
        newHP === 0 ? " <b>DOWN.</b>" : ""
      }`,
    );
  }
}

/**
 * Apply a successful lethality roll: target drops to 0 HP.
 */
export async function applyLethalityToTargets() {
  const tokens = resolveTargetTokens();
  if (!tokens.length) {
    ui.notifications.warn(
      DGUtils.localizeWithFallback(
        "DG2.Apply.NoTarget",
        "Target or select a token first.",
      ),
    );
    return;
  }

  for (const token of tokens) {
    const { actor } = token;
    if (!actor?.system?.health || !canModify(actor)) continue;
    const oldHP = actor.system.health.value;
    // eslint-disable-next-line no-await-in-loop
    await actor.update({ "system.health.value": 0 });
    // eslint-disable-next-line no-await-in-loop
    await whisperGM(
      `<b>${actor.name}</b> suffers a <b>LETHAL</b> hit. HP ${oldHP} &rarr; 0.`,
    );
  }
}

/**
 * Apply sanity loss. Applies to targeted/selected tokens if any,
 * otherwise falls back to the actor who made the roll (the usual case).
 * Alerts the GM if the loss crosses the actor's breaking point, or if
 * the loss in one hit is 5+ (temporary insanity per the Agent's Handbook).
 *
 * @param {Object} options
 * @param {number} options.san - the sanity loss to apply.
 * @param {Actor} [options.fallbackActor] - the rolling actor.
 */
export async function applySanToTargets({ san, fallbackActor }) {
  const tokens = resolveTargetTokens();
  let actors = tokens.map((t) => t.actor).filter((a) => a?.system?.sanity);
  if (!actors.length && fallbackActor?.system?.sanity) {
    actors = [fallbackActor];
  }
  if (!actors.length) {
    ui.notifications.warn(
      DGUtils.localizeWithFallback(
        "DG2.Apply.NoSanTarget",
        "No valid target with a Sanity score.",
      ),
    );
    return;
  }

  for (const actor of actors) {
    if (!canModify(actor)) continue;
    const oldSan = actor.system.sanity.value;
    const newSan = Math.max(0, oldSan - san);
    // eslint-disable-next-line no-await-in-loop
    await actor.update({ "system.sanity.value": newSan });

    let note = `<b>${actor.name}</b> loses <b>${san}</b> SAN. ${oldSan} &rarr; ${newSan}.`;
    if (san >= 5) {
      note += ` <b>TEMPORARY INSANITY</b> (5+ SAN from one source).`;
    }
    const breakingPoint = actor.system.sanity.currentBreakingPoint;
    if (
      typeof breakingPoint === "number" &&
      oldSan > breakingPoint &&
      newSan <= breakingPoint
    ) {
      note += ` <b>BREAKING POINT REACHED</b> &mdash; the agent gains a disorder and should reset their breaking point.`;
    }
    if (newSan === 0) {
      note += ` <b>PERMANENT INSANITY.</b>`;
    }
    // eslint-disable-next-line no-await-in-loop
    await whisperGM(note);
  }
}

/**
 * Router for DG2 chat-card buttons. Returns true if the action was handled.
 *
 * @param {HTMLElement} btn - the clicked button.
 * @param {ChatMessage} message - the chat message the button lives in.
 * @returns {Promise<boolean>}
 */
export async function handleDG2ChatAction(btn, message) {
  const { action } = btn.dataset;
  switch (action) {
    case "dg2-apply-damage":
      await applyDamageToTargets({
        damage: parseInt(btn.dataset.damage) || 0,
        ap: parseInt(btn.dataset.ap) || 0,
      });
      return true;
    case "dg2-apply-lethality":
      await applyLethalityToTargets();
      return true;
    case "dg2-apply-san":
      await applySanToTargets({
        san: parseInt(btn.dataset.san) || 0,
        fallbackActor: message?.speakerActor,
      });
      return true;
    default:
      return false;
  }
}
