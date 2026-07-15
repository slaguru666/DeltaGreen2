/* eslint-disable max-classes-per-file */
import DGUtils from "../other/utility-functions.js";
import DG from "../config.js";
import {
  tagRollDice,
  colorsetForPercentileRoll,
} from "../integrations/dice-so-nice.js";

const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;

export class DGRoll extends Roll {
  /**
   * NOTE: This class will rarely be called on its own. It should generally be extended. Look to DGPercentileRoll as an example.
   *
   * Customize our roll with some useful information, passed in the `options` Object.
   *
   * @param {string}          formula            Unused - The string formula to parse (from Foundry)
   * @param {Object}          data               Unused - The data object against which to parse attributes within the formula
   * @param {Object}          [options]          Additional data which is preserved in the database
   * @param {Number}          [options.rollType] The type of roll (stat, skill, sanity, damage, etc).
   * @param {String}          [options.key]      The key of the skill, stat, etc. to use as a basis for this roll.
   * @param {DeltaGreenActor} [options.actor]    The actor that this roll originates from.
   * @param {DeltaGreenItem}  [options.item]     Optional - The item from which the roll originates.
   */
  constructor(formula, data = {}, options = {}) {
    super(formula, data, options);
    const { rollType, key, actor, item } = options;
    this.type = rollType;
    this.key = key;
    this.actor = actor;
    this.item = item;
    this.modifier = 0;
  }

  /**
   * Simple function that actually creates the message and sends it to chat.
   * We override this to have a little more control over certain aspects of the message,
   * right now, its `speaker` and `rollMode`.
   *
   * @override
   * The following `@param` descriptions comes from the Foundry VTT code.
   * @param {object} messageData          The data object to use when creating the message
   * @param {options} [options]           Additional options which modify the created message.
   * @param {string} [options.rollMode]   The template roll mode to use for the message from CONFIG.Dice.rollModes
   * @param {boolean} [options.create=true]   Whether to automatically create the chat message, or only return the
   *                                          prepared chatData object.
   * @returns {Promise<ChatMessage|object>} A promise which resolves to the created ChatMessage document if create is
   *                                        true, or the Object of prepared chatData otherwise.
   */
  async toMessage(messageData = {}, { rollMode, create = true } = {}) {
    // eslint-disable-next-line no-param-reassign
    messageData.speaker = ChatMessage.getSpeaker({ actor: this.actor });

    // Tag the message with its DG2 variant (agency/lethality/unnatural),
    // derived from the Dice So Nice colorset set in toChat. The chat
    // renderer uses this to style the card.
    const colorset = this.dice[0]?.options?.colorset;
    if (colorset?.startsWith("dg2-")) {
      // eslint-disable-next-line no-param-reassign
      messageData.flags = foundry.utils.mergeObject(
        { deltagreen2: { variant: colorset.replace("dg2-", "") } },
        messageData.flags ?? {},
      );
    }

    return super.toMessage(messageData, {
      rollMode: this.options.rollMode || rollMode,
      create,
    });
  }
}

export class DGPercentileRoll extends DGRoll {
  /**
   * Creates D100 rolls, the base die of the system.
   *
   * This constructor embeds the following info into the roll:
   *   1. Target number that the roll needs to beat.
   *   2. Localized name for the roll.
   *
   * Note: In order for all of our custom data to persist, our constructor must use the same parameters as its parent class.
   * So, even though percentile rolls will always have a formula of "1d100" and we don't use the `data` object,
   * we still have to keep them as parameters.
   *
   * @param {string}          formula            Unused - The string formula to parse (from Foundry) - Always "1d100" for percentile rolls.
   * @param {Object}          data               Unused - The data object against which to parse attributes within the formula
   * @param {Object}          [options]          Additional data which is preserved in the database
   * @param {Number}          [options.rollType] The type of roll (stat, skill, sanity, etc).
   * @param {String}          [options.key]      The key of the skill, stat, etc. to use as a basis for this roll.
   * @param {DeltaGreenActor} [options.actor]    The actor that this roll originates from.
   * @param {DeltaGreenItem}  [options.item]     Optional - The item from which the roll originates.
   * @param {DeltaGreenItem}  [options.specialTrainingName] Optional - Special training rolls have names that are different from the roll key.
   */
  // eslint-disable-next-line default-param-last, no-unused-vars
  constructor(formula = "1D100", data = {}, options) {
    super("1D100", {}, options);

    // Set roll info for Skill, Stat, Typed Skill, and non-custom Weapon Percentile rolls.
    const { target, localizedKey, skillPath } = this.getRollInfoFromKey(
      this.key,
      this.actor.system,
    );
    this.target = target;
    this.localizedKey = localizedKey;
    this.skillPath = skillPath;

    // Set roll info for other Percentile rolls
    switch (this.type) {
      case "special-training":
        this.specialTrainingName = options.specialTrainingName;
        this.localizedKey = `${this.specialTrainingName} - (${this.localizedKey})`;
        break;
      case "weapon":
        // If this weapon uses a custom target for rolls, we set that explicitly.
        if (this.key === "custom") {
          this.target = this.item.system.customSkillTarget;
          this.localizedKey = game.i18n.localize("DG.ItemWindow.Custom");
        }
        // Add a the weapon's internal modifier.
        this.modifier += this.item.system.skillModifier;
        break;
      case "sanity":
        this.target = this.actor.system.sanity.value;
        this.localizedKey = game.i18n.localize("DG.Attributes.SAN");
        break;
      case "luck":
        this.target = 50;
        this.localizedKey = game.i18n.localize("DG.Luck");
        break;
      default:
        break;
    }
  }

  /**
   * Shows a dialog that can modify the roll.
   *
   * @returns {Promise<Object|void>} - the results of the dialog.
   */
  async showDialog() {
    const privateSanSetting = game.settings.get(
      "deltagreen2",
      "keepSanityPrivate",
    );

    let hideSanTarget = false;
    if (
      privateSanSetting &&
      (this.type === "sanity" || this.key === "ritual") &&
      !game.user.isGM
    ) {
      hideSanTarget = true;
    }

    let customModifierTarget = 20;

    if (this.actor != null) {
      try {
        customModifierTarget = parseInt(
          this.actor.system.settings.rolling.defaultPercentileModifier,
        );
      } catch {
        // do nothing
      }
    }

    const backingData = {
      data: {
        label: this.localizedKey,
        originalTarget: this.target,
        targetModifier: customModifierTarget,
        hideTarget: hideSanTarget,
      },
    };

    const template =
      "systems/deltagreen2/templates/dialog/modify-percentile-roll.html";
    const content = await renderTemplate(template, backingData);
    return new Promise((resolve, reject) => {
      const modButtons = [-40, -20, 20, 40].map((mod) => {
        const sign = mod > 0 ? "Positive" : "Negative";
        return {
          action: `roll${Math.abs(mod)}${sign}`,
          label: String(mod),
          callback: (event, button, dialog) => {
            try {
              const rollMode =
                dialog.element.querySelector("[name='rollMode']")?.value;
              resolve({ targetModifier: mod, rollMode });
            } catch (ex) {
              reject(console.log(ex));
            }
          },
        };
      });

      new DialogV2({
        content,
        window: {
          title: DGUtils.localizeWithFallback(
            "DG.ModifySkillRollDialogue.Title",
            "Modify Roll",
          ),
        },
        buttons: [
          {
            default: true,
            action: "roll",
            label: DGUtils.localizeWithFallback("DG.Roll.Roll", "Roll"),
            callback: (event, button, dialog) => {
              try {
                let targetModifier = dialog.element.querySelector(
                  "[name='targetModifier']",
                )?.value; // this is text as a heads up

                const rollMode =
                  dialog.element.querySelector("[name='rollMode']")?.value;

                const plusMinus = dialog.element.querySelector(
                  "[name='plusOrMinus']",
                )?.value;

                if (
                  targetModifier.trim() !== "" &&
                  !Number.isNaN(targetModifier)
                ) {
                  targetModifier = Math.abs(parseInt(targetModifier));

                  if (plusMinus === "-") {
                    targetModifier *= -1;
                  }

                  // update the custom target modifier so it 'persists' between dialogs
                  if (this.actor != null) {
                    this.actor.update({
                      "system.settings.rolling.defaultPercentileModifier":
                        targetModifier,
                    });
                  }
                }
                resolve({ targetModifier, rollMode });
              } catch (ex) {
                reject(console.log(ex));
              }
            },
          },
          ...modButtons,
        ],
      }).render(true);
    });
  }

  /**
   * Prepares data for a chat message and then passes that data
   * to a method that actually creates a ChatMessage.
   *
   * Lays out and styles message based on outcome of the roll.
   *
   * @returns {Promise<ChatMessage>} - the created chat message.
   */
  async toChat() {
    // if using private san rolls, must hide any SAN roll unless user is a GM
    const privateSanSetting = game.settings.get(
      "deltagreen2",
      "keepSanityPrivate",
    );
    if (
      privateSanSetting &&
      (this.type === "sanity" || this.key === "ritual") &&
      !game.user.isGM
    ) {
      this.options.rollMode = "blindroll";
    }

    const diceSoNice =
      game.modules.has("dice-so-nice") &&
      game.modules.get("dice-so-nice").active;

    const colorset = colorsetForPercentileRoll(this);
    tagRollDice(this, colorset);

    // Structured card header data.
    const typeLabel =
      colorset === "dg2-unnatural"
        ? DGUtils.localizeWithFallback("DG2.Chat.TheUnnatural", "THE UNNATURAL")
        : DGUtils.localizeWithFallback(
            "DG2.Chat.FieldOperation",
            "FIELD OPERATION",
          );
    let rollName = this.localizedKey ?? this.formula;
    if (this.isInhuman) {
      rollName += ` [${game.i18n.localize("DG.Roll.Inhuman").toUpperCase()}]`;
    }
    const targetText = `${DGUtils.localizeWithFallback(
      "DG2.Chat.Target",
      "TARGET",
    )} ${this.effectiveTarget}%`;
    // Show the math when the effective target differs from the base value.
    let chipDetail = "";
    const { isExhausted, exhaustedCheckPenalty } = this.exhausted;
    if (this.modifier || isExhausted) {
      chipDetail = `${this.target}%`;
      if (this.modifier) {
        chipDetail += `${DGUtils.formatStringWithLeadingPlus(this.modifier)}%`;
      }
      if (isExhausted) {
        chipDetail += `${DGUtils.formatStringWithLeadingPlus(
          exhaustedCheckPenalty,
        )}%`;
      }
    }

    let resultString = "";
    let outcomeClass = "";
    let outcomeIcon = "";

    if (this.isSuccess) {
      if (this.isCritical) {
        resultString = `${game.i18n
          .localize("DG.Roll.CriticalSuccess")
          .toUpperCase()}`;
        outcomeClass = "dg2-crit-success";
        outcomeIcon = "fa-star";
      } else {
        resultString = `${game.i18n.localize("DG.Roll.Success")}`;
        outcomeClass = "dg2-success";
        outcomeIcon = "fa-check";
      }
    } else if (this.isCritical) {
      resultString = `${game.i18n
        .localize("DG.Roll.CriticalFailure")
        .toUpperCase()}`;
      outcomeClass = "dg2-crit-failure";
      outcomeIcon = "fa-skull";
    } else {
      resultString = `${game.i18n.localize("DG.Roll.Failure")}`;
      outcomeClass = "dg2-failure";
      outcomeIcon = "fa-xmark";
    }

    // Margin of success/failure, e.g. "made it by 23".
    let marginText = "";
    if (typeof this.effectiveTarget === "number") {
      const margin = this.isSuccess
        ? this.effectiveTarget - this.total
        : this.total - this.effectiveTarget;
      marginText = this.isSuccess
        ? `${DGUtils.localizeWithFallback(
            "DG2.Roll.MadeItBy",
            "made it by",
          )} ${margin}`
        : `${DGUtils.localizeWithFallback(
            "DG2.Roll.MissedBy",
            "missed by",
          )} ${margin}`;
    }

    // Expend ammunition on weapon attack rolls.
    const { ammoLine, outOfAmmo } = await this.expendAmmo();

    const failureMark =
      this.actor?.type === "agent" &&
      !this.isSuccess &&
      this.skillPath &&
      this.key !== "unnatural" &&
      !foundry.utils.getProperty(this.actor, `${this.skillPath}.failure`) &&
      game.settings.get(DG.ID, "skillFailure");

    const html = await renderTemplate(
      "systems/deltagreen2/templates/roll/percentile-roll.hbs",
      {
        typeLabel,
        rollName,
        targetText,
        chipDetail,
        outcomeClass,
        outcomeIcon,
        marginText,
        resultString,
        formula: this.formula,
        total: this.total,
        failureMark,
        ammoLine,
        outOfAmmo,
      },
    );

    // TODO: add setting for it?
    if (failureMark) {
      const keyForUpdate = `${this.skillPath}.failure`;

      const message = await this.toMessage({
        flags: {
          deltagreen2: {
            rollbacks: {
              [keyForUpdate]: false,
            },
          },
        },
        content: html,
      });

      if (diceSoNice) {
        await game.dice3d.waitFor3DAnimationByMessageID(message.id);
      }

      // TODO: auto-update actor or post icon with manual apply
      await this.actor.update({
        [keyForUpdate]: true,
      });

      return message;
    }

    return this.toMessage({ content: html });
  }

  /**
   * Expend one round of ammunition on a weapon attack roll.
   * Only applies to owned weapon items that track ammo (ammo or ammoMax > 0),
   * and only when the ammoTracking setting is enabled.
   *
   * @returns {Promise<Object>} - { ammoLine, outOfAmmo } for the chat card, or {}.
   */
  async expendAmmo() {
    if (this.type !== "weapon" || !this.item?.isOwned) return {};
    if (!game.settings.get(DG.ID, "ammoTracking")) return {};

    const ammo = this.item.system.ammo ?? 0;
    const ammoMax = this.item.system.ammoMax ?? 0;
    if (ammo <= 0 && ammoMax <= 0) return {}; // This weapon does not track ammo.

    if (ammo <= 0) {
      return {
        ammoLine: DGUtils.localizeWithFallback(
          "DG2.Ammo.OutOfAmmo",
          "OUT OF AMMO — reload!",
        ),
        outOfAmmo: true,
      };
    }

    const remaining = ammo - 1;
    await this.item.update({ "system.ammo": remaining });
    const maxDisplay = ammoMax > 0 ? ` / ${ammoMax}` : "";
    return {
      ammoLine: `${DGUtils.localizeWithFallback(
        "DG2.Ammo.Remaining",
        "Ammo",
      )}: ${remaining}${maxDisplay}`,
      outOfAmmo: remaining === 0,
    };
  }

  /**
   * Utility function, called in the DGPercentileRoll constructor.
   * If this roll key corresponds to a stat, skill,
   * or typedSkill, get pertinent info.
   *
   * This is used for Stat, Skill, Typed Skill, Weapon, and Special Training Rolls.
   *
   * @returns {Object} - Contains the roll target and localized version of the key.
   */
  getRollInfoFromKey() {
    const actorData = this.actor.system;
    const skillKeys = Object.keys(actorData.skills);
    const typedSkillKeys = Object.keys(actorData.typedSkills);
    const statKeys = Object.keys(actorData.statistics);

    let target = null;
    let localizedKey = null;
    let skillPath = null; // For optimization of failure checks
    if (statKeys.includes(this.key)) {
      target = actorData.statistics[this.key].x5;
      localizedKey = game.i18n.localize(`DG.Attributes.${this.key}`);
    }
    if (skillKeys.includes(this.key)) {
      // use calculated target proficiency (effects and etc like aim + 20%)
      target =
        actorData.skills[this.key].targetProficiency ||
        actorData.skills[this.key].proficiency;
      localizedKey = game.i18n.localize(`DG.Skills.${this.key}`);
      skillPath = `system.skills.${this.key}`;
    }
    if (typedSkillKeys.includes(this.key)) {
      const skill = actorData.typedSkills[this.key];
      target = skill.proficiency;
      localizedKey = `${skill.group} (${skill.label})`;
      skillPath = `system.typedSkills.${this.key}`;
    }
    if (this.key === "ritual") {
      target = actorData.sanity.ritual;
      localizedKey = game.i18n.localize(`DG.Skills.ritual`);
    }
    return { target, localizedKey, skillPath };
  }

  /**
   * Create label based on result of roll
   *
   * todo: do we want make isInhuman more similar to base label?
   *
   * @returns {string}
   */
  createLabel() {
    const startOfLabel = `${game.i18n.localize("DG.Roll.Rolling")} <b>${
      this.localizedKey
    }`;
    const endOfLabel = `${game.i18n.localize("DG.Roll.Target")} ${
      this.effectiveTarget
    }`;

    let label = this.isInhuman
      ? // "Inhuman" stat being rolled. See function for details.
        `${startOfLabel} [${game.i18n
          .localize("DG.Roll.Inhuman")
          .toUpperCase()}]</b> ${endOfLabel}`
      : `${startOfLabel}</b><br> ${endOfLabel}%`;

    const { isExhausted, exhaustedCheckPenalty } = this.exhausted;

    if (this.modifier || isExhausted) {
      label += ` (${this.target}%`;

      if (this.modifier) {
        label += `${DGUtils.formatStringWithLeadingPlus(this.modifier)}%`;
      }

      if (isExhausted) {
        label += `${DGUtils.formatStringWithLeadingPlus(
          exhaustedCheckPenalty,
        )}%`;
      }

      label += `)`;
    }

    return label;
  }

  get exhausted() {
    let isExhausted = false;
    let exhaustedCheckPenalty = -20;

    try {
      // I suspect (but am not entirely certain) that being tired doesn't make you less lucky)
      if (this.type !== "luck") {
        isExhausted = this.actor.system.physical.exhausted;
        exhaustedCheckPenalty = this.actor.system.physical.exhaustedPenalty;
        exhaustedCheckPenalty = -1 * Math.abs(exhaustedCheckPenalty);
      }
    } catch {
      isExhausted = false;
      exhaustedCheckPenalty = -20;
    }

    return { isExhausted, exhaustedCheckPenalty };
  }

  /**
   * "Inhuman" stat being rolled, logic is different per page 188 of the Handler's Guide.
   * Note - originally implemented by Uriele, but my attempt at merging conficts went poorly, so re-implementing.
   * For an inhuman check, the roll succeeds except on a roll of 100 which fails AND fumbles.
   * If the roll is a matching digit roll, it is a critical as normal.
   * Also, if the roll is below the regular (non-x5) value of the stat, it is a critical.  E.g. a CON of 25, a d100 roll of 21 would be a critical.
   *
   * @returns {Boolean}
   */
  get isInhuman() {
    /*
      Changing this to only consider the base x5 stat target for whether something is 'inhuman'
      because I do not think the intent was an Agent with a high strength getting a +40% bonus to be considered 'inhuman'
      and therefore benefit from the increased crit threshold, although could be wrong about this.
    */
    if (this.target > 99 && this.type === "stat") {
      return true;
    }
    return false;
  }

  /**
   * Determines if a roll result is critical.
   * If roll has not been evaluated, return null.
   *
   * @returns {null|Boolean}
   */
  get isCritical() {
    // If roll isn't evaluated, return null.
    if (!this.total) {
      return null;
    }
    let isCritical = false;

    // 1, 100, or any matching dice are a crit, i.e. 11, 22, 33...99.
    if (this.total === 1 || this.total === 100 || this.total % 11 === 0) {
      // really good, or reeaaaally bad
      isCritical = true;
    }

    // If inhuman and the roll is below the regular (non-x5) value of the stat, it is a critical.
    // E.g. a CON of 25, a d100 roll of 21 would be a critical.
    if (this.isInhuman && this.total <= this.target / 5) {
      isCritical = true;
    }

    return isCritical;
  }

  /**
   * Determines if a roll succeeded.
   * If roll has not been evaluated, return null.
   *
   * @returns {null|Boolean}
   */
  get isSuccess() {
    // If roll isn't evaluated, return null.
    if (!this.total) {
      return null;
    }

    // A roll of 100 always (critically) fails, even for inhuman rolls.
    if (this.total === 100) return false;
    return this.total <= this.effectiveTarget;
  }

  /**
   * Actual target for the roll accounting for modifier if present.
   * Floored to 1 if a negative modifier would bring it below 1.
   * Capped at 99 unless it is an inhuman stat test.
   * Also worth noting, per page 47 of the Agent's Handbook, Exhaustion penalties
   * affect not only skill and stat tests, but SAN tests as well...
   *
   * @returns {null|integer}
   */
  get effectiveTarget() {
    let target = 1;

    const { isExhausted, exhaustedCheckPenalty } = this.exhausted;

    if (!this.target || Number.isNaN(this.target)) {
      return null;
    }

    target = parseInt(this.target);

    if (isExhausted) {
      target += exhaustedCheckPenalty;
    }

    if (this.modifier && !Number.isNaN(this.modifier)) {
      const modifier = parseInt(this.modifier);

      target += modifier;

      // per agent's handbook (pg.43), a negative modifier can't lower a target below 1%
      target = Math.max(target, 1);
    }

    // an 'inhuman' stat test can exceed 99% as a target, but skill tests otherwise cannot (agents handbook pg.43)
    if (!this.isInhuman) {
      target = Math.min(target, 99);
    }

    return target;
  }
}

export class DGLethalityRoll extends DGPercentileRoll {
  /**
   * See constructor for DGPercentileRoll. This theoretically could be done in the parent class'
   * constructor, but since Lethality rolls needs its own class for custom methods anyway,
   * we will set the target and localized key here.
   *
   * @param {String} formula
   * @param {Object} data
   * @param {Object} options
   */
  constructor(formula, data, options) {
    super(formula, data, options);
    this.target = options.item.system.lethality;
    this.localizedKey = game.i18n.localize("DG.ItemWindow.Weapons.Lethality");
  }

  /**
   * Prepares data for a chat message and then passes that data
   * to a method that actually creates a ChatMessage.
   *
   * Lays out and styles message based on outcome of the roll.
   *
   * Overrides `DGPercentileRoll.toChat()`
   *
   * @returns {Promise<ChatMessage>} - the created chat message.
   * @override
   */
  async toChat() {
    tagRollDice(this, "dg2-lethality");

    // Note: intentionally target + modifier, not effectiveTarget - a lethality
    // roll is a property of the weapon, so exhaustion penalties do not apply.
    const isLethal = this.total <= this.target + this.modifier;

    let resultString = "";
    let outcomeClass = "";
    let outcomeIcon = "";
    if (isLethal) {
      resultString = `${game.i18n.localize("DG.Roll.Lethal").toUpperCase()}`;
      outcomeClass = "dg2-lethal";
      outcomeIcon = "fa-skull-crossbones";
    } else {
      resultString = `${game.i18n.localize("DG.Roll.Failure")}`;
      outcomeClass = "dg2-failure";
      outcomeIcon = "fa-xmark";
    }

    const { nonLethalDamage } = this;
    let targetText = `${game.i18n.localize("DG.Roll.Lethality").toUpperCase()} ${
      this.target + this.modifier
    }%`;
    if (this.modifier) {
      targetText += ` (${DGUtils.formatStringWithLeadingPlus(this.modifier)}%)`;
    }

    const html = await renderTemplate(
      "systems/deltagreen2/templates/roll/lethality-roll.hbs",
      {
        typeLabel: DGUtils.localizeWithFallback(
          "DG2.Chat.LethalForce",
          "LETHAL FORCE",
        ),
        rollName: this.item.name,
        targetText,
        resultString,
        outcomeClass,
        outcomeIcon,
        total: this.total,
        nonLethal: nonLethalDamage,
        isLethal,
        ap: this.item?.system.armorPiercing ?? 0,
      },
    );

    return this.toMessage({ content: html });
  }

  /**
   * Calculates the damage for when a lethality roll fails.
   * If roll has not been evaluated, return null.
   *
   * See full rules on page 57 of agent's handbook.
   *
   * Note, this getter does not actually care if the roll has failed.
   *
   * @returns {null|Object} - return data about the non-lethal damage.
   */
  get nonLethalDamage() {
    if (!this.total) {
      return null;
    }

    // Try to determine what the d100 result would be as if it was two d10's being rolled.
    const totalString = this.total.toString();
    const digits = totalString.length;
    let die1;
    let die2;
    switch (digits) {
      case 1:
        // If one digit in the result, one die is a 10, and the other is the result.
        [die1, die2] = [10, this.total];
        break;
      case 2:
        // If two digits in the result, each die is the value of one of the digits. If one of those digits is 0, make it 10.
        [die1, die2] = totalString
          .split("")
          .map((digit) => parseInt(digit))
          .map((digit) => digit || 10);
        break;
      case 3:
        // If three digits in the result (aka result === 100), each die is a 10.
        [die1, die2] = [10, 10];
        break;
      default:
        break;
    }

    const total = die1 + die2;
    return { die1, die2, total };
  }
}

export class DGDamageRoll extends DGRoll {
  /**
   * Prepares data for a chat message and then passes that data
   * to a method that actually creates a ChatMessage.
   *
   * @returns {Promise<ChatMessage>} - the created chat message.
   * @override
   */
  async toChat() {
    tagRollDice(this, "dg2-lethality");

    const html = await renderTemplate(
      "systems/deltagreen2/templates/roll/damage-roll.hbs",
      {
        typeLabel: DGUtils.localizeWithFallback(
          "DG2.Chat.LethalForce",
          "LETHAL FORCE",
        ),
        rollName:
          this.item?.name ??
          game.i18n.localize("DG.Roll.Damage").toUpperCase(),
        targetText: game.i18n.localize("DG.Roll.Damage").toUpperCase(),
        formula: this.formula,
        total: this.total,
        dice: this.dice.flatMap((die) =>
          die.results.map((r) => ({ faces: die.faces, result: r.result })),
        ),
        ap: this.item?.system.armorPiercing ?? 0,
      },
    );

    return this.toMessage({ content: html });
  }

  async showDialog() {
    const template =
      "systems/deltagreen2/templates/dialog/modify-damage-roll.html";
    const backingData = {
      data: {
        label: this.item?.name,
        originalFormula: this.formula,
        outerModifier: "2 * ",
        innerModifier: "+ 0",
      },
    };

    const content = await renderTemplate(template, backingData);
    return new Promise((resolve, reject) => {
      new DialogV2({
        content,
        window: {
          title: game.i18n.localize("DG.ModifySkillRollDialogue.Title"),
        },
        buttons: [
          {
            default: true,
            label: game.i18n.translations.DG.Roll.Roll,
            action: "roll",
            callback: (event, button, dialog) => {
              try {
                const outerModifier = dialog.element.querySelector(
                  "[name='outerModifier']",
                )?.value; // this is text as a heads up
                let innerModifier = dialog.element.querySelector(
                  "[name='innerModifier']",
                )?.value; // this is text as a heads up
                const modifiedBaseRoll = dialog.element.querySelector(
                  "[name='originalFormula']",
                )?.value; // this is text as a heads up
                const rollMode = dialog.element.querySelector(
                  "[name='targetRollMode']",
                )?.value;

                if (innerModifier.replace(" ", "") === "+0") {
                  innerModifier = "";
                }

                let newFormula = "";
                if (outerModifier.trim() !== "") {
                  newFormula += `${outerModifier}(${modifiedBaseRoll}${innerModifier.trim()})`;
                } else {
                  newFormula += modifiedBaseRoll + innerModifier.trim();
                }

                resolve({ newFormula, rollMode });
              } catch (ex) {
                reject(console.log(ex));
              }
            },
          },
        ],
      }).render(true);
    });
  }
}

export class DGSanityDamageRoll extends DGRoll {
  /**
   * Prepares data for a chat message and then passes that data
   * to a method that actually creates a ChatMessage.
   *
   * @returns {Promise<ChatMessage>} - the created chat message.
   * @override
   */
  async toChat() {
    tagRollDice(this, "dg2-unnatural");

    const [lowDie, highDie] = this.terms[0].terms.map((formula) => {
      return Roll.parse(formula)[0] || { faces: parseInt(formula), number: 1 };
    });

    const [lowResult, highResult] = this.damageResults;

    const html = await renderTemplate(
      "systems/deltagreen2/templates/roll/sanity-damage-roll.hbs",
      {
        typeLabel: DGUtils.localizeWithFallback(
          "DG2.Chat.TheUnnatural",
          "THE UNNATURAL",
        ),
        rollName: DGUtils.localizeWithFallback(
          "DG.Generic.SanDamage",
          "SAN DAMAGE",
        ),
        targetText: `${lowDie.formula} / ${highDie.formula}`,
        lowFormula: lowDie.formula,
        highFormula: highDie.formula,
        lowFaces: lowDie.faces,
        highFaces: highDie.faces,
        lowResult,
        highResult,
      },
    );

    return this.toMessage({ content: html });
  }

  /**
   * Returns the two results for a sanity damage roll.
   *
   * Returns null if the roll has not been evaluated.
   *
   * @returns {null|Array<Number>} - Array of result numbers
   */
  get damageResults() {
    if (!this.total) return null;

    const [lowResult, highResult] = this.terms[0].results;
    return [lowResult?.result, highResult?.result];
  }
}
