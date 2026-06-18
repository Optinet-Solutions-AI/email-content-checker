/**
 * route.ts — GET / PATCH / DELETE /api/contacts/:id
 *
 * Inputs:  path id; PATCH body of editable fields
 * Outputs: the contact / updated contact / { deleted }
 * Used by: dashboard contacts page (edit, unsubscribe, delete)
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

const patchSchema = z.object({
  email: z.string().email().optional(),
  first_name: z.string().trim().nullable().optional(),
  last_name: z.string().trim().nullable().optional(),
  company: z.string().trim().nullable().optional(),
  custom_fields: z.record(z.string()).optional(),
  unsubscribed: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { data, error } = await db.from("contacts").select("*").eq("id", params.id).single();
    if (error || !data) return fail("Contact not found", 404);
    return ok({ contact: data });
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const patch = { ...parsed.data };
    if (patch.email) patch.email = patch.email.toLowerCase();

    const { data, error } = await db
      .from("contacts")
      .update(patch)
      .eq("id", params.id)
      .select()
      .single();
    if (error) return fail(error.message, 500);
    return ok({ contact: data });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { error } = await db.from("contacts").delete().eq("id", params.id);
    if (error) return fail(error.message, 500);
    return ok({ deleted: true });
  });
}
