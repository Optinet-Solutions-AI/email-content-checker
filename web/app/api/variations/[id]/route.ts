/**
 * route.ts — DELETE /api/variations/:id (remove a saved variation)
 *
 * Inputs:  path id
 * Outputs: { deleted }
 * Used by: Templates workspace
 */
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { error } = await db.from("content_variations").delete().eq("id", params.id);
    if (error) return fail(error.message, 500);
    return ok({ deleted: true });
  });
}
