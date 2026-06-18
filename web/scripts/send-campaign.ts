/**
 * send-campaign.ts — CLI: generate and/or send a campaign without the serverless timeout
 *
 * Inputs:  argv: <campaign_id> [--generate-only] [--send-only]
 * Outputs: prints generate/send result counts; exit 1 on failure
 * Used by: `npm run send:campaign -- <campaign_id>` (run from web/)
 *
 * Loads the repo-root .env, then drives lib/generation/run-campaign.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// .env lives one level above web/.
loadEnv({ path: resolve(process.cwd(), "..", ".env") });

async function main() {
  const args = process.argv.slice(2);
  const campaignId = args.find((a) => !a.startsWith("--"));
  if (!campaignId) {
    console.error("Usage: npm run send:campaign -- <campaign_id> [--generate-only] [--send-only]");
    process.exit(1);
  }
  const generateOnly = args.includes("--generate-only");
  const sendOnly = args.includes("--send-only");

  // Import AFTER env is loaded (config.ts validates env at import time).
  const { generateCampaign, sendCampaign } = await import("../lib/generation/run-campaign");

  if (!sendOnly) {
    console.log(`Generating campaign ${campaignId}…`);
    const g = await generateCampaign(campaignId);
    console.log(`  generated=${g.generated} failed=${g.failed}`);
  }

  if (!generateOnly) {
    console.log(`Sending campaign ${campaignId}…`);
    const s = await sendCampaign(campaignId);
    console.log(`  sent=${s.sent} failed=${s.failed} capped=${s.capped}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
