/**
 * route.ts — DELETE /api/email-accounts/:id (remove a sender mailbox)
 *
 * Inputs:  path id
 * Outputs: { deleted }
 * Used by: dashboard sender mailboxes
 */
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { error } = await db.from("email_accounts").delete().eq("id", params.id);
    if (error) return fail(error.message, 500);
    return ok({ deleted: true });
  });
}
