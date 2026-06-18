/**
 * route.ts — POST /api/content-templates/seed (load the 5 shipped samples)
 *
 * Inputs:  none
 * Outputs: { seeded } — upserts SEED_TEMPLATES on seed_key (idempotent)
 * Used by: Templates library "Load sample templates" button
 */
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";
import { SEED_TEMPLATES } from "@/lib/seed/content-templates";

export const runtime = "nodejs";

export async function POST() {
  return handle(async () => {
    const rows = SEED_TEMPLATES.map((t) => ({ ...t, is_seed: true }));
    const { data, error } = await db
      .from("content_templates")
      .upsert(rows, { onConflict: "seed_key" })
      .select("id");
    if (error) return fail(error.message, 500);
    return ok({ seeded: data?.length ?? 0 });
  });
}
