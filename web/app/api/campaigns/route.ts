/**
 * route.ts — GET (list) + POST (create) /api/campaigns
 *
 * Inputs:  POST { name, template_id, sender_account_id? }
 * Outputs: campaign rows (with template name) / created campaign
 * Used by: dashboard campaigns page
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  template_id: z.string().uuid("template_id must be a valid id"),
  sender_account_id: z.string().uuid().nullable().optional(),
});

export async function GET() {
  return handle(async () => {
    const { data, error } = await db
      .from("campaigns")
      .select("*, templates(name)")
      .order("created_at", { ascending: false });
    if (error) return fail(error.message, 500);
    return ok({ campaigns: data });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { data, error } = await db
      .from("campaigns")
      .insert({
        name: parsed.data.name,
        template_id: parsed.data.template_id,
        sender_account_id: parsed.data.sender_account_id ?? null,
        status: "draft",
      })
      .select()
      .single();
    if (error) return fail(error.message, 500);
    return ok({ campaign: data }, 201);
  });
}
