/**
 * route.ts — GET / PATCH / DELETE /api/content-templates/:id
 *
 * Inputs:  path id; PATCH body of editable fields
 * Outputs: the template / updated template / { deleted }
 * Used by: Templates library + workspace
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  brand: z.string().trim().nullable().optional(),
  locale: z.string().trim().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
});

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { data, error } = await db
      .from("content_templates")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error || !data) return fail("Template not found", 404);
    return ok({ template: data });
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { data, error } = await db
      .from("content_templates")
      .update(parsed.data)
      .eq("id", params.id)
      .select()
      .single();
    if (error) return fail(error.message, 500);
    return ok({ template: data });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { error } = await db.from("content_templates").delete().eq("id", params.id);
    if (error) return fail(error.message, 500);
    return ok({ deleted: true });
  });
}
