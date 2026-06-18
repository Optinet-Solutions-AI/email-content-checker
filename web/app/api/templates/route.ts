/**
 * route.ts — GET (list) + POST (create) /api/templates
 *
 * Inputs:  POST { name, subject?, body?, ai_instructions? }
 * Outputs: template rows / created template
 * Used by: dashboard templates page
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  subject: z.string().default(""),
  body: z.string().default(""),
  ai_instructions: z.string().nullable().optional(),
});

export async function GET() {
  return handle(async () => {
    const { data, error } = await db
      .from("templates")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) return fail(error.message, 500);
    return ok({ templates: data });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { data, error } = await db.from("templates").insert(parsed.data).select().single();
    if (error) return fail(error.message, 500);
    return ok({ template: data }, 201);
  });
}
