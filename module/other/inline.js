/* eslint-disable import/prefer-default-export */
import { handleDG2ChatAction } from "./apply-effects.js";

export async function handleInlineActions(btnWithAction, messageId) {
  const action = btnWithAction.dataset?.action;
  const message = game.messages.get(messageId);

  // DG2 apply actions work off targets, not the message speaker.
  if (action?.startsWith("dg2-")) {
    await handleDG2ChatAction(btnWithAction, message);
    return;
  }

  const actor = message?.speakerActor;
  if (!actor) return;

  if (action === "rollback-skill-failure-state") {
    const rollbackFlag = message.getFlag("deltagreen2", "rollbacks");
    await actor.update(foundry.utils.deepClone(rollbackFlag));

    // eslint-disable-next-line no-use-before-define
    toggleAllSkillFailures(rollbackFlag);

    const label = btnWithAction
      .closest(".rollback-section")
      ?.querySelector("label");
    const oldHtml = label.outerHTML;
    label.classList.toggle("strike");

    message.update({
      [`flags.deltagreen2.rollbacks`]: rollbackFlag,
      content: message.content.replace(oldHtml, label.outerHTML),
    });
  }
}

function toggleAllSkillFailures(data) {
  for (const skill of Object.values(data.system?.skills || {})) {
    skill.failure = !skill.failure;
  }
  for (const skill of Object.values(data.system?.typedSkills || {})) {
    skill.failure = !skill.failure;
  }
}
