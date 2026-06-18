/**
 * route.ts — GET /api/campaigns/:id (detail + per-status message counts)
 *
 * Inputs:  path id
 * Outputs: { campaign, template, sender, counts, messages }
 * Used by: dashboard campaign detail page
 */
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { data: campaign, error } = await db
      .from("campaigns")
      .select("*, templates(*), email_accounts(id, email)")
      .eq("id", params.id)
      .single();
    if (error || !campaign) return fail("Campaign not found", 404);

    const { data: messages, error: mErr } = await db
      .from("messages")
      .select("*, contacts(email, first_name, last_name, company, unsubscribed)")
      .eq("campaign_id", params.id)
      .order("created_at", { ascending: true });
    if (mErr) return fail(mErr.message, 500);

    const counts = { draft: 0, sent: 0, failed: 0, total: messages?.length ?? 0 };
    for (const m of messages ?? []) {
      counts[m.status as "draft" | "sent" | "failed"]++;
    }

    return ok({ campaign, messages, counts });
  });
}
