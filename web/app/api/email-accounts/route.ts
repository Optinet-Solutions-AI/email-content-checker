/**
 * route.ts — GET (list) + POST (connect) /api/email-accounts
 *
 * Inputs:  POST { email, smtp_host, smtp_port?, smtp_user, smtp_pass, daily_cap? }
 * Outputs: mailbox rows (WITHOUT smtp_pass) / created mailbox
 * Used by: dashboard settings / sender mailboxes
 *
 * On connect we verify the SMTP credentials and stamp verified_at on success.
 */
import { z } from "zod";
import { db, type EmailAccount } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";
import { verifyAccount } from "@/lib/services/smtp-sender";

export const runtime = "nodejs";

const SAFE_COLUMNS = "id, email, smtp_host, smtp_port, smtp_user, daily_cap, verified_at, created_at";

const createSchema = z.object({
  email: z.string().email(),
  smtp_host: z.string().trim().min(1),
  smtp_port: z.coerce.number().int().positive().default(587),
  smtp_user: z.string().trim().min(1),
  smtp_pass: z.string().min(1),
  daily_cap: z.coerce.number().int().positive().default(50),
});

export async function GET() {
  return handle(async () => {
    const { data, error } = await db
      .from("email_accounts")
      .select(SAFE_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) return fail(error.message, 500);
    return ok({ accounts: data });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const verified = await verifyAccount(parsed.data as EmailAccount);

    const { data, error } = await db
      .from("email_accounts")
      .insert({
        ...parsed.data,
        verified_at: verified ? new Date().toISOString() : null,
      })
      .select(SAFE_COLUMNS)
      .single();
    if (error) return fail(error.message, 500);

    return ok({ account: data, verified }, 201);
  });
}
