/**
 * route.ts — POST /api/campaigns/:id/send
 *
 * Inputs:  path id
 * Outputs: { sent, failed, capped }
 * Used by: dashboard campaign detail page (Send button)
 *
 * Honors EMAIL_SENDING_PAUSED_UNTIL + the mailbox daily_cap. Large sends → CLI.
 */
import { ok, fail, handle } from "@/lib/response";
import { sendCampaign } from "@/lib/generation/run-campaign";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: { id: string } };

export async function POST(_req: Request, { params }: Ctx) {
  return handle(async () => {
    try {
      const result = await sendCampaign(params.id);
      return ok(result);
    } catch (err) {
      return fail((err as Error).message, 500);
    }
  });
}
