/**
 * generate-variation.ts — produce reworded / reformatted variations of a template
 *
 * Inputs:  a content template + options { count, sanitize, withHtml }
 * Outputs: GeneratedVariation[] — each rewritten for new words + new layout AND
 *          driven to a CLEAN deliverability score via a repair loop
 * Used by: app/api/content-templates/[id]/variations
 *
 * The whole point of a variation is to IMPROVE on the source, so by default each
 * one is sanitized and then re-checked; if the checker still flags it, the findings
 * are fed back to the AI to fix (up to MAX_REPAIR_ATTEMPTS), keeping the cleanest result.
 *
 * Max count = MAX_VARIATIONS. Reasoning: each variation is an independent AI call, so
 * per-item quality does NOT drop with count. What limits useful count is (a) DIVERSITY —
 * a single short promo email has a finite number of genuinely distinct rewrites before
 * they converge (we ship 10 distinct "angles"), and (b) the Gemini free-tier rate limit
 * (~15 req/min) since calls run in parallel and repairs add a few more. 10 is a safe cap;
 * 3–6 is the practical sweet spot.
 */
import "server-only";
import {
  DELIVERABILITY_AI_RULES,
  lintDeliverability,
  sanitizeContent,
  type DeliverabilityFinding,
  type DeliverabilityReport,
} from "../deliverability";
import { textToHtml } from "../html";
import { generateJson } from "../services/gemini";

/** What the generator needs — a saved template row OR ad-hoc pasted content both satisfy this. */
export interface VariationSource {
  name: string;
  brand?: string | null;
  locale: string;
  text: string;
  html?: string;
}

/** Hard cap on variations per request (see file header for the rationale). */
export const MAX_VARIATIONS = 10;
/** How many times to feed checker findings back to the AI to reach a clean score. */
const MAX_REPAIR_ATTEMPTS = 2;
/** Output-token caps (smaller = faster). Text is short; HTML needs headroom. */
const MAX_TOKENS_TEXT = 1200;
const MAX_TOKENS_HTML = 4096;

export interface VariationOptions {
  count?: number;
  /** Aim for a clean deliverability score (sanitise + repair). Default true. */
  sanitize?: boolean;
  /** Ask the AI for fully styled HTML (slower). Off = fast text-only; HTML derived from text. */
  withHtml?: boolean;
}

export interface GeneratedVariation {
  label: string;
  subject: string;
  text: string;
  html: string;
  notes: string;
  sanitized: boolean;
  report: DeliverabilityReport;
}

interface VariationDraft {
  label: string;
  subject: string;
  text: string;
  html?: string;
  notes: string;
}

// 10 distinct angles so each variation differs in layout + voice, not just words.
const ANGLES = [
  "a fresh, friendly rewrite with a different opening hook",
  "a concise, minimalist layout — short lines, lots of whitespace",
  "a benefit-led restructure that leads with what the reader gets",
  "a warm, conversational tone as if writing to one person",
  "a clean, professional layout with a single clear call-to-action",
  "a curiosity-driven opener that teases the offer before revealing it",
  "a reassuring, low-pressure tone that emphasises ease and security",
  "a short story / scenario framing that paints a small picture",
  "a direct and punchy style — very short sentences",
  "a value-summary format with one clearly highlighted offer line",
];

const SYSTEM = (sanitize: boolean, withHtml: boolean) =>
  [
    "You rewrite marketing emails into NEW variations.",
    "Keep the SAME offer, intent, brand, and language/locale as the source.",
    "Change the wording AND the layout/format — do not copy sentences verbatim.",
    "Keep any ${name} placeholder exactly as-is. Keep a clear call-to-action and an unsubscribe/footer if the source had one.",
    "The `text` must be the plain-text version of the content.",
    withHtml
      ? "The `html` must be a complete, self-contained HTML email snippet using INLINE styles only (no <style> blocks, no markdown, no code fences)."
      : "Do NOT include an `html` field. Return text only — it is faster.",
    sanitize
      ? "SANITIZE for deliverability — this is mandatory:\n" + DELIVERABILITY_AI_RULES
      : "Do not sanitize — preserve the promotional style, but still vary the wording.",
  ].join("\n");

function jsonKeys(withHtml: boolean): string {
  return withHtml
    ? `{"label": string (3-5 word name), "subject": string, "text": string (plain text), "html": string (inline-styled HTML), "notes": string (one line: what changed and why)}`
    : `{"label": string (3-5 word name), "subject": string, "text": string (plain text), "notes": string (one line: what changed and why)}`;
}

function prompt(source: VariationSource, angle: string, withHtml: boolean): string {
  return [
    `Source template: "${source.name}" (brand: ${source.brand ?? "n/a"}, locale: ${source.locale}).`,
    "",
    "SOURCE TEXT:",
    source.text,
    "",
    `Write ONE new variation as ${angle}.`,
    "Return strict JSON with exactly these keys:",
    jsonKeys(withHtml),
  ].join("\n");
}

function repairPrompt(prev: VariationDraft, findings: DeliverabilityFinding[], withHtml: boolean): string {
  const issues = findings
    .map((f) => `- ${f.message}${f.suggestion ? " " + f.suggestion : ""}`)
    .join("\n");
  return [
    "The previous variation still trips deliverability checks. Rewrite it so NONE of these remain,",
    "while keeping the same offer, brand, language, and meaning (keep any ${name} placeholder):",
    "",
    issues,
    "",
    "PREVIOUS SUBJECT:",
    prev.subject ?? "",
    "PREVIOUS TEXT:",
    prev.text ?? "",
    "",
    "Return strict JSON with exactly these keys:",
    jsonKeys(withHtml),
  ].join("\n");
}

function finalize(draft: VariationDraft, sanitize: boolean, report: DeliverabilityReport, index: number): GeneratedVariation {
  const text = draft.text ?? "";
  return {
    label: draft.label || `Variation ${index + 1}`,
    subject: draft.subject ?? "",
    text,
    html: draft.html?.trim() || textToHtml(text),
    notes: draft.notes ?? "",
    sanitized: sanitize,
    report,
  };
}

/** Generate one variation, then repair until the checker is clean (or attempts run out). */
async function generateOne(
  source: VariationSource,
  angle: string,
  sanitize: boolean,
  withHtml: boolean,
  index: number,
): Promise<GeneratedVariation> {
  const maxTokens = withHtml ? MAX_TOKENS_HTML : MAX_TOKENS_TEXT;
  const ignore = source.brand ? [source.brand] : [];
  // Deterministically clear "!" + currency symbols on every draft (the AI can't reintroduce them),
  // and check with the brand exempted so the brand's own words aren't flagged as spam.
  const clean = (d: VariationDraft): VariationDraft => ({
    ...d,
    subject: sanitizeContent(d.subject ?? ""),
    text: sanitizeContent(d.text ?? ""),
    html: d.html ? sanitizeContent(d.html) : d.html,
  });
  const lint = (d: VariationDraft) => lintDeliverability(d.subject ?? "", d.text ?? "", { ignore });

  let draft = clean(await generateJson<VariationDraft>(prompt(source, angle, withHtml), SYSTEM(sanitize, withHtml), maxTokens));
  let report = lint(draft);

  for (let attempt = 0; sanitize && report.level !== "clean" && attempt < MAX_REPAIR_ATTEMPTS; attempt++) {
    const repaired = clean(
      await generateJson<VariationDraft>(repairPrompt(draft, report.findings, withHtml), SYSTEM(sanitize, withHtml), maxTokens),
    );
    const repairedReport = lint(repaired);
    if (repairedReport.score >= report.score) break; // not improving — keep the better one
    draft = repaired;
    report = repairedReport;
  }

  return finalize(draft, sanitize, report, index);
}

export async function generateVariations(
  source: VariationSource,
  { count = 3, sanitize = true, withHtml = false }: VariationOptions = {},
): Promise<GeneratedVariation[]> {
  const n = Math.min(Math.max(count, 1), MAX_VARIATIONS);

  // All variations run concurrently — wall time ≈ the slowest single chain (incl. repairs),
  // not the sum. A single failure drops just that one (allSettled).
  const settled = await Promise.allSettled(
    Array.from({ length: n }, (_, i) => generateOne(source, ANGLES[i % ANGLES.length], sanitize, withHtml, i)),
  );

  const out = settled
    .filter((r): r is PromiseFulfilledResult<GeneratedVariation> => r.status === "fulfilled")
    .map((r) => r.value);

  if (out.length === 0) throw new Error("Generation failed — the AI returned no usable variations.");
  return out;
}
