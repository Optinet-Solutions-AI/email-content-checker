/**
 * html.ts — tiny HTML<->text helpers (PURE, client + server safe, no I/O)
 *
 * Inputs:  html or plain text strings
 * Outputs: stripHtml (HTML -> readable text), textToHtml (text -> basic HTML)
 * Used by: content-template create (derive missing side) + the checker page
 */

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/** Convert HTML into readable plain text (good enough for the checker). */
export function stripHtml(html: string): string {
  let s = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  for (const [ent, ch] of Object.entries(ENTITIES)) s = s.replaceAll(ent, ch);
  return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Wrap plain text into a minimal, email-safe HTML body. */
export function textToHtml(text: string): string {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return (
    `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;">` +
    `${paras}</div>`
  );
}
