/**
 * run-campaign.ts — generate all / send all for a campaign (the orchestrator)
 *
 * Inputs:  a campaign id
 * Outputs: per-recipient `messages` rows (generate); SMTP sends (send). Updates DB status.
 * Used by: app/api/campaigns/[id]/generate, .../send, scripts/send-campaign.ts
 *
 * v1 audience rule: a campaign targets ALL non-unsubscribed contacts. The `messages`
 * rows are the snapshot. Segmenting/filtering the audience is a future improvement.
 */
import "server-only";
import { db, type Campaign, type Contact, type EmailAccount, type Template } from "../db";
import { logger } from "../logger";
import { sendingIsPaused } from "../config";
import { sendEmail } from "../services/smtp-sender";
import { generateMessage } from "./generate-message";

export interface GenerateResult {
  generated: number;
  skipped: number;
  failed: number;
}

export interface SendResult {
  sent: number;
  failed: number;
  capped: boolean;
}

async function loadCampaign(campaignId: string): Promise<Campaign> {
  const { data, error } = await db.from("campaigns").select("*").eq("id", campaignId).single();
  if (error || !data) throw new Error(`Campaign ${campaignId} not found`);
  return data as Campaign;
}

// ── GENERATE ──────────────────────────────────────────────────────────────────

export async function generateCampaign(campaignId: string): Promise<GenerateResult> {
  const campaign = await loadCampaign(campaignId);

  const { data: template, error: tErr } = await db
    .from("templates")
    .select("*")
    .eq("id", campaign.template_id)
    .single();
  if (tErr || !template) throw new Error("Template not found for campaign");

  const { data: contacts, error: cErr } = await db
    .from("contacts")
    .select("*")
    .eq("unsubscribed", false);
  if (cErr) throw new Error(`Failed to load contacts: ${cErr.message}`);

  await db.from("campaigns").update({ status: "generating" }).eq("id", campaignId);

  const result: GenerateResult = { generated: 0, skipped: 0, failed: 0 };
  try {
    for (const contact of (contacts ?? []) as Contact[]) {
      try {
        const msg = await generateMessage(template as Template, contact as Contact);
        // Upsert keeps generation idempotent (unique campaign_id+contact_id).
        const { error } = await db.from("messages").upsert(
          {
            campaign_id: campaignId,
            contact_id: contact.id,
            subject: msg.subject,
            body: msg.body,
            status: "draft",
            edited_by_operator: false,
            last_error: null,
          },
          { onConflict: "campaign_id,contact_id" },
        );
        if (error) throw new Error(error.message);
        result.generated++;
      } catch (err) {
        result.failed++;
        logger.warn(
          { campaignId, contactId: contact.id, err: (err as Error).message },
          "generate-message failed",
        );
      }
    }
    await db.from("campaigns").update({ status: "ready" }).eq("id", campaignId);
  } catch (err) {
    await db.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
    throw err;
  }

  logger.info({ campaignId, ...result }, "campaign generated");
  return result;
}

// ── SEND ────────────────────────────────────────────────────────────────────

export async function sendCampaign(campaignId: string): Promise<SendResult> {
  if (sendingIsPaused()) {
    throw new Error("Sending is paused (EMAIL_SENDING_PAUSED_UNTIL is in the future).");
  }

  const campaign = await loadCampaign(campaignId);
  if (!campaign.sender_account_id) {
    throw new Error("Campaign has no sender mailbox assigned.");
  }

  const { data: account, error: aErr } = await db
    .from("email_accounts")
    .select("*")
    .eq("id", campaign.sender_account_id)
    .single();
  if (aErr || !account) throw new Error("Sender mailbox not found.");
  const sender = account as EmailAccount;

  // Draft messages for this campaign, oldest first.
  const { data: drafts, error: mErr } = await db
    .from("messages")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "draft")
    .order("created_at", { ascending: true });
  if (mErr) throw new Error(`Failed to load messages: ${mErr.message}`);

  const queue = (drafts ?? []) as Array<{
    id: string;
    contact_id: string;
    subject: string;
    body: string;
  }>;

  // v1: cap this run at the mailbox daily_cap (simple guard; refine with real daily counting later).
  const capped = queue.length > sender.daily_cap;
  const toSend = queue.slice(0, sender.daily_cap);

  await db.from("campaigns").update({ status: "sending" }).eq("id", campaignId);

  const result: SendResult = { sent: 0, failed: 0, capped };
  for (const msg of toSend) {
    const { data: contact } = await db
      .from("contacts")
      .select("email, unsubscribed")
      .eq("id", msg.contact_id)
      .single();

    if (!contact || contact.unsubscribed) {
      result.failed++;
      await db
        .from("messages")
        .update({ status: "failed", last_error: "recipient missing or unsubscribed" })
        .eq("id", msg.id);
      continue;
    }

    try {
      await sendEmail(sender, { to: contact.email, subject: msg.subject, text: msg.body });
      await db
        .from("messages")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", msg.id);
      result.sent++;
    } catch (err) {
      await db
        .from("messages")
        .update({ status: "failed", last_error: (err as Error).message })
        .eq("id", msg.id);
      result.failed++;
    }
  }

  await db
    .from("campaigns")
    .update({ status: result.failed > 0 && result.sent === 0 ? "failed" : "sent" })
    .eq("id", campaignId);

  logger.info({ campaignId, ...result }, "campaign send complete");
  return result;
}
