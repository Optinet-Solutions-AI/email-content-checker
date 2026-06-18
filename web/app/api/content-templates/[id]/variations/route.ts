/**
 * route.ts — GET (list) + POST (generate) /api/content-templates/:id/variations
 *
 * Inputs:  POST { count?, sanitize?, save? }
 * Outputs: generated variations (each with a deliverability report); saved by default
 * Used by: Templates workspace (Generate variations)
 *
 * Uses Gemini — operator-triggered, free-tier. Large counts: keep ≤5 per run.
 */
import { z } from "zod";
import { db, type ContentTemplate } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";
import { geminiConfigured } from "@/lib/services/gemini";
import { generateVariations, MAX_VARIATIONS } from "@/lib/generation/generate-variation";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: { id: string } };

const genSchema = z.object({
  count: z.coerce.number().int().min(1).max(MAX_VARIATIONS).default(3),
  sanitize: z.boolean().default(true),
  withHtml: z.boolean().default(false),
  save: z.boolean().default(true),
});

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { data, error } = await db
      .from("content_variations")
      .select("*")
      .eq("template_id", params.id)
      .order("created_at", { ascending: false });
    if (error) return fail(error.message, 500);
    return ok({ variations: data });
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    if (!geminiConfigured()) {
      return fail("GOOGLE_GENAI_API_KEY is not set — add it to the repo-root .env to generate.", 400);
    }
    const parsed = genSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { data: template, error } = await db
      .from("content_templates")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error || !template) return fail("Template not found", 404);

    const generated = await generateVariations(template as ContentTemplate, {
      count: parsed.data.count,
      sanitize: parsed.data.sanitize,
      withHtml: parsed.data.withHtml,
    });

    if (!parsed.data.save) {
      return ok({ variations: generated });
    }

    const rows = generated.map((v) => ({
      template_id: params.id,
      label: v.label,
      subject: v.subject,
      text: v.text,
      html: v.html,
      notes: v.notes,
      sanitized: v.sanitized,
      risk_score: v.report.score,
      risk_level: v.report.level,
    }));
    const { data: saved, error: sErr } = await db
      .from("content_variations")
      .insert(rows)
      .select();
    if (sErr) return fail(sErr.message, 500);

    return ok({ variations: saved }, 201);
  });
}
