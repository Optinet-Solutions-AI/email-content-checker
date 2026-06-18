/**
 * route.ts — POST /api/deliverability/check (server-side spam/deliverability lint)
 *
 * Inputs:  { subject?, body? }
 * Outputs: a DeliverabilityReport
 * Used by: anything that wants a server-side check (the editor lints client-side directly)
 */
import { z } from "zod";
import { ok, fail, handle } from "@/lib/response";
import { lintDeliverability } from "@/lib/deliverability";

export const runtime = "nodejs";

const schema = z.object({ subject: z.string().default(""), body: z.string().default("") });

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    return ok({ report: lintDeliverability(parsed.data.subject, parsed.data.body) });
  });
}
