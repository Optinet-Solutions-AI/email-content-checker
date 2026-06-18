/**
 * render-template.ts — the template markup contract (pure string ops, no AI)
 *
 * Inputs:  template strings + a contact
 * Outputs: merge-field substitution, plus extraction of {{fields}} and [[ai_slots]]
 * Used by: lib/generation/generate-message.ts, the template editor (field hints)
 *
 * Contract:
 *   {{merge_field}}  -> replaced by contact data (no AI)
 *   [[ai_slot]]      -> rewritten per recipient by the AI (see generate-message.ts)
 */
import type { Contact } from "../db";

const MERGE_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;
const SLOT_RE = /\[\[\s*([^\]]+?)\s*\]\]/g;

/** Flatten a contact into the lookup table used for {{merge_fields}}. */
export function contactMergeData(contact: Contact): Record<string, string> {
  return {
    email: contact.email,
    first_name: contact.first_name ?? "",
    last_name: contact.last_name ?? "",
    full_name: [contact.first_name, contact.last_name].filter(Boolean).join(" "),
    company: contact.company ?? "",
    ...contact.custom_fields,
  };
}

/** Unique {{merge_field}} names referenced in a string. */
export function extractMergeFields(text: string): string[] {
  return [...new Set([...text.matchAll(MERGE_RE)].map((m) => m[1]))];
}

/** [[ai_slot]] instruction strings referenced in a string (order preserved). */
export function extractAiSlots(text: string): string[] {
  return [...text.matchAll(SLOT_RE)].map((m) => m[1]);
}

/** Replace every {{field}} with its value (unknown / empty fields -> ""). */
export function applyMergeFields(text: string, data: Record<string, string>): string {
  return text.replace(MERGE_RE, (_, key: string) => data[key] ?? "");
}

/** Replace the first [[...]] occurrence matching `instruction` with `value`. */
export function fillSlot(text: string, instruction: string, value: string): string {
  let done = false;
  return text.replace(SLOT_RE, (whole, inner: string) => {
    if (!done && inner.trim() === instruction.trim()) {
      done = true;
      return value;
    }
    return whole;
  });
}
