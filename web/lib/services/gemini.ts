/**
 * gemini.ts — Google Gemini client (variation copy + structured JSON)
 *
 * Inputs:  GOOGLE_GENAI_API_KEY / GOOGLE_GENAI_MODEL; a prompt string
 * Outputs: generated text, or a parsed JSON object
 * Used by: lib/generation/generate-variation.ts
 *
 * Uses the @google/genai SDK with thinkingBudget=0 — this turns OFF Gemini 2.5's
 * "thinking" phase (the main source of latency) WITHOUT downgrading the model, so
 * we keep gemini-2.5-flash quality at a fraction of the response time.
 */
import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "../config";
import { logger } from "../logger";
import { withRetry } from "../retry";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!env.GOOGLE_GENAI_API_KEY) {
    throw new Error(
      "GOOGLE_GENAI_API_KEY is not set — cannot generate AI copy. Add it to the repo-root .env.",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey: env.GOOGLE_GENAI_API_KEY });
  return client;
}

/** True when a key is configured (UI can hide/disable generate without it). */
export function geminiConfigured(): boolean {
  return Boolean(env.GOOGLE_GENAI_API_KEY);
}

// thinkingBudget 0 = thinking OFF (big latency cut, same model quality). Rewriting
// is a generation task, not a reasoning task, so thinking adds time without value.
const NO_THINKING = { thinkingConfig: { thinkingBudget: 0 } } as const;

/** Generate one block of copy. `system` carries tone/length/goal rules. */
export async function generateCopy(prompt: string, system?: string): Promise<string> {
  return withRetry(
    async () => {
      const started = Date.now();
      const res = await getClient().models.generateContent({
        model: env.GOOGLE_GENAI_MODEL,
        contents: prompt,
        config: { ...NO_THINKING, ...(system ? { systemInstruction: system } : {}) },
      });
      const text = (res.text ?? "").trim();
      logger.info(
        { provider: "gemini", model: env.GOOGLE_GENAI_MODEL, ms: Date.now() - started },
        "gemini.generateCopy ok",
      );
      if (!text) throw new Error("Gemini returned empty text");
      return text;
    },
    { label: "gemini.generateCopy" },
  );
}

/**
 * Generate a strict JSON object. Uses Gemini's JSON response mode and parses the
 * result; the caller's prompt must describe the exact shape expected.
 * `maxOutputTokens` caps the response (smaller = faster) — pass it for short content.
 */
export async function generateJson<T>(
  prompt: string,
  system?: string,
  maxOutputTokens?: number,
): Promise<T> {
  return withRetry(
    async () => {
      const started = Date.now();
      const res = await getClient().models.generateContent({
        model: env.GOOGLE_GENAI_MODEL,
        contents: prompt,
        config: {
          ...NO_THINKING,
          responseMimeType: "application/json",
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
          ...(system ? { systemInstruction: system } : {}),
        },
      });
      const raw = (res.text ?? "").trim();
      logger.info(
        { provider: "gemini", model: env.GOOGLE_GENAI_MODEL, ms: Date.now() - started },
        "gemini.generateJson ok",
      );
      try {
        return JSON.parse(raw) as T;
      } catch {
        // Salvage a JSON object if the model wrapped it in prose/fences.
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]) as T;
        throw new Error("Gemini did not return valid JSON");
      }
    },
    { label: "gemini.generateJson" },
  );
}
