/**
 * route.ts — POST /api/email-accounts/test (verify SMTP, no send)
 *
 * Inputs:  { id } of a saved mailbox
 * Outputs: { verified }  (also stamps verified_at when it passes)
 * Used by: dashboard sender mailboxes (Test connection)
 */
import { z } from "zod";
import { db, type EmailAccount } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";
import { verifyAccount } from "@/lib/services/smtp-sender";

export const runtime = "nodejs";

const schema = z.object({ id: z.string().uuid() });

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { data: account, error } = await db
      .from("email_accounts")
      .select("*")
      .eq("id", parsed.data.id)
      .single();
    if (error || !account) return fail("Mailbox not found", 404);

    const verified = await verifyAccount(account as EmailAccount);
    await db
      .from("email_accounts")
      .update({ verified_at: verified ? new Date().toISOString() : null })
      .eq("id", parsed.data.id);

    return ok({ verified });
  });
}
