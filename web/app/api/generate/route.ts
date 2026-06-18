/**
 * route.ts — POST /api/generate (generate improved variations of ANY content)
 *
 * Inputs:  { text, subject?, name?, brand?, locale?, count?, withHtml? }
 *          (text may be the body of a saved template or ad-hoc pasted content)
 * Outputs: { variations } — each rewritten, sanitised, and driven to a clean
 *          deliverability score. In-memory (not saved) — this is the Checker's engine.
 * Used by: the Checker page (pick a template or paste content → generate)
 *
 * Uses Gemini — operator-triggered only. Variations run in parallel; ≤10 per request.
 */
import { z } from "zod";
import { ok, fail, handle } from "@/lib/response";
import { geminiConfigured } from "@/lib/services/gemini";
import { generateVariations, MAX_VARIATIONS } from "@/lib/generation/generate-variation";

export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  text: z.string().trim().min(1, "content is required"),
  subject: z.string().optional(),
  name: z.string().optional(),
  brand: z.string().nullable().optional(),
  locale: z.string().optional(),
  count: z.coerce.number().int().min(1).max(MAX_VARIATIONS).default(3),
  withHtml: z.boolean().default(false),
});

export async function POST(req: Request) {
  return handle(async () => {
    if (!geminiConfigured()) {
      return fail("GOOGLE_GENAI_API_KEY is not set — add it to the repo-root .env to generate.", 400);
    }
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    // Fold an optional subject into the body so the generator (and checker) see it.
    const body = parsed.data.subject
      ? `${parsed.data.subject}\n\n${parsed.data.text}`
      : parsed.data.text;

    const variations = await generateVariations(
      {
        name: parsed.data.name || "Content",
        brand: parsed.data.brand ?? null,
        locale: parsed.data.locale || "en",
        text: body,
      },
      { count: parsed.data.count, sanitize: true, withHtml: parsed.data.withHtml },
    );

    return ok({ variations });
  });
}
