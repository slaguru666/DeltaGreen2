/**
 * Delta Green 2 — Dice So Nice integration.
 *
 * Registers three themed colorsets and applies them per roll type:
 *  - dg2-agency:    olive drab, bone numerals — skill/stat/luck/weapon checks
 *  - dg2-lethality: black and blood red — lethality and damage rolls
 *  - dg2-unnatural: void violet with a sickly glow — SAN checks, rituals,
 *                   and sanity damage
 */

const CATEGORY = "Delta Green 2";

/**
 * Register the DG2 dice appearance with Dice So Nice.
 * Called from the diceSoNiceReady hook.
 *
 * @param {Object} dice3d - the Dice So Nice API object.
 */
export function registerDG2DiceSoNice(dice3d) {
  // "default" sets this as the table default for users who have not
  // customized their own dice, so the system looks right out of the box.
  dice3d.addColorset(
    {
      name: "dg2-agency",
      description: "DG2 — Agency Issue",
      category: CATEGORY,
      foreground: "#e8e4d5",
      background: "#3a4a24",
      outline: "#151a0d",
      edge: "#242f16",
      texture: "cloudy",
      material: "metal",
      font: "Special Elite",
      visibility: "visible",
    },
    "default",
  );

  dice3d.addColorset({
    name: "dg2-lethality",
    description: "DG2 — Lethal Force",
    category: CATEGORY,
    foreground: "#ff3b30",
    background: "#0d0d0f",
    outline: "#000000",
    edge: "#3d0a06",
    texture: "fire",
    material: "metal",
    font: "Special Elite",
    visibility: "visible",
  });

  dice3d.addColorset({
    name: "dg2-unnatural",
    description: "DG2 — The Unnatural",
    category: CATEGORY,
    foreground: "#8dffb0",
    background: "#1a0b2e",
    outline: "#050208",
    edge: "#2c1150",
    texture: "astral",
    material: "glass",
    font: "Special Elite",
    emissive: "#2a0a4a",
    emissiveIntensity: 0.4,
    visibility: "visible",
  });
}

/**
 * Tag every die in a roll with a DG2 colorset so Dice So Nice renders
 * the themed dice for this roll regardless of the user's default.
 *
 * @param {Roll} roll - an evaluated (or about to be evaluated) roll.
 * @param {"dg2-agency"|"dg2-lethality"|"dg2-unnatural"} colorset
 */
export function tagRollDice(roll, colorset) {
  try {
    for (const die of roll.dice) {
      die.options.colorset = colorset;
    }
  } catch {
    // Dice theming must never break the roll itself.
  }
}

/**
 * Pick the DG2 colorset for a percentile roll based on its type.
 *
 * @param {DGPercentileRoll} roll
 * @returns {string} colorset name
 */
export function colorsetForPercentileRoll(roll) {
  if (roll.type === "sanity" || roll.key === "ritual") {
    return "dg2-unnatural";
  }
  return "dg2-agency";
}
