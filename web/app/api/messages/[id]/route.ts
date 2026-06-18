/**
 * route.ts — GET / PATCH /api/messages/:id
 *
 * Inputs:  path id; PATCH { subject?, body? } (operator hand-edit)
 * Outputs: the message / updated message
 * Used by: dashboard campaign detail page (preview + edit one message)
 *
 * A hand-edited message is marked edited_by_operator=true and forced back to 'draft'.
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

const patchSchema = z
  .object({ subject: z.string().optional(), body: z.string().optional() })
  .refine((v) => v.subject !== undefined || v.body !== undefined, "nothing to update");

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { data, error } = await db
      .from("messages")
      .select("*, contacts(email, first_name, last_name, company)")
      .eq("id", params.id)
      .single();
    if (error || !data) return fail("Message not found", 404);
    return ok({ message: data });
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { data, error } = await db
      .from("messages")
      .update({ ...parsed.data, edited_by_operator: true, status: "draft", last_error: null })
      .eq("id", params.id)
      .select()
      .single();
    if (error) return fail(error.message, 500);
    return ok({ message: data });
  });
}
