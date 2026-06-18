/**
 * route.ts — GET (list) + POST (create custom) /api/content-templates
 *
 * Inputs:  POST { name, brand?, locale?, html?, text? } (at least one of html/text)
 * Outputs: template rows / created template
 * Used by: dashboard Templates library
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";
import { stripHtml, textToHtml } from "@/lib/html";

export const runtime = "nodejs";

const createSchema = z
  .object({
    name: z.string().trim().min(1, "name is required"),
    brand: z.string().trim().optional(),
    locale: z.string().trim().default("en"),
    html: z.string().optional(),
    text: z.string().optional(),
  })
  .refine((v) => (v.html && v.html.trim()) || (v.text && v.text.trim()), "Provide HTML or text");

export async function GET() {
  return handle(async () => {
    const { data, error } = await db
      .from("content_templates")
      .select("*")
      .order("is_seed", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return fail(error.message, 500);
    return ok({ templates: data });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const html = parsed.data.html?.trim() || textToHtml(parsed.data.text!.trim());
    const text = parsed.data.text?.trim() || stripHtml(parsed.data.html!.trim());

    const { data, error } = await db
      .from("content_templates")
      .insert({
        name: parsed.data.name,
        brand: parsed.data.brand ?? null,
        locale: parsed.data.locale,
        html,
        text,
        is_seed: false,
      })
      .select()
      .single();
    if (error) return fail(error.message, 500);
    return ok({ template: data }, 201);
  });
}
