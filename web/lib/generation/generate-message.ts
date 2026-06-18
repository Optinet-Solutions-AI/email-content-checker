/**
 * generate-message.ts — turn one (template + contact) into a UNIQUE email
 *
 * Inputs:  a Template + a Contact
 * Outputs: { subject, body } — AI slots filled per recipient, then merge fields applied
 * Used by: lib/generation/run-campaign.ts, app/api/messages/[id]/regenerate
 *
 * Steps:
 *   1. For each [[ai_slot]] in subject + body, ask Gemini to write copy for THIS contact.
 *   2. Splice the AI copy back into the template.
 *   3. Apply {{merge_fields}} over the result.
 * One Gemini call per AI slot per recipient — keep slot count low.
 */
import "server-only";
import type { Contact, Template } from "../db";
import { DELIVERABILITY_AI_RULES } from "../deliverability";
import { generateCopy } from "../services/gemini";
import {
  applyMergeFields,
  contactMergeData,
  extractAiSlots,
  fillSlot,
} from "./render-template";

export interface GeneratedMessage {
  subject: string;
  body: string;
}

function contactContext(contact: Contact): string {
  const lines = [
    `Email: ${contact.email}`,
    contact.first_name && `First name: ${contact.first_name}`,
    contact.last_name && `Last name: ${contact.last_name}`,
    contact.company && `Company: ${contact.company}`,
    ...Object.entries(contact.custom_fields).map(([k, v]) => `${k}: ${v}`),
  ].filter(Boolean);
  return lines.join("\n");
}

function slotPrompt(
  instruction: string,
  contact: Contact,
  template: Template,
): string {
  return [
    "You are writing one section of a personalized 1:1 email.",
    "Write ONLY the text for this section — no preamble, no quotes, no labels, no markdown.",
    template.ai_instructions ? `Overall style/goal: ${template.ai_instructions}` : "",
    "",
    "Recipient details:",
    contactContext(contact),
    "",
    `Write this section: ${instruction}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM =
  "You write concise, natural, genuinely personalized email copy. " +
  "Vary wording between recipients. Never invent facts not given. " +
  "Return plain text only.\n\n" +
  DELIVERABILITY_AI_RULES;

export async function generateMessage(
  template: Template,
  contact: Contact,
): Promise<GeneratedMessage> {
  let subject = template.subject;
  let body = template.body;

  // Collect every distinct AI-slot instruction across subject + body.
  const slots = [...new Set([...extractAiSlots(subject), ...extractAiSlots(body)])];

  for (const instruction of slots) {
    const copy = await generateCopy(slotPrompt(instruction, contact, template), SYSTEM);
    subject = fillSlot(subject, instruction, copy);
    body = fillSlot(body, instruction, copy);
  }

  const data = contactMergeData(contact);
  return {
    subject: applyMergeFields(subject, data).trim(),
    body: applyMergeFields(body, data),
  };
}
