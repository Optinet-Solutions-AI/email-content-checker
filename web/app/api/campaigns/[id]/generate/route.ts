/**
 * route.ts — POST /api/campaigns/:id/generate
 *
 * Inputs:  path id
 * Outputs: { generated, skipped, failed }
 * Used by: dashboard campaign detail page (Generate button)
 *
 * NOTE: one Gemini call per AI slot per recipient. For large audiences use the
 * CLI (`npm run send:campaign`) to avoid the serverless timeout.
 */
import { ok, fail, handle } from "@/lib/response";
import { generateCampaign } from "@/lib/generation/run-campaign";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: { id: string } };

export async function POST(_req: Request, { params }: Ctx) {
  return handle(async () => {
    try {
      const result = await generateCampaign(params.id);
      return ok(result);
    } catch (err) {
      return fail((err as Error).message, 500);
    }
  });
}
