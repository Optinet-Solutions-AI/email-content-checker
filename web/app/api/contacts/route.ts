/**
 * route.ts — GET (list) + POST (create) /api/contacts
 *
 * Inputs:  GET: optional ?search; POST: { email, first_name?, last_name?, company?, custom_fields? }
 * Outputs: contact rows / created contact
 * Used by: dashboard contacts page
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";

export const runtime = "nodejs";

const createSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  company: z.string().trim().optional(),
  custom_fields: z.record(z.string()).optional(),
});

export async function GET(req: Request) {
  return handle(async () => {
    const search = new URL(req.url).searchParams.get("search")?.trim();
    let query = db.from("contacts").select("*").order("created_at", { ascending: false });
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`,
      );
    }
    const { data, error } = await query.limit(500);
    if (error) return fail(error.message, 500);
    return ok({ contacts: data });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { data, error } = await db
      .from("contacts")
      .upsert(
        {
          email: parsed.data.email.toLowerCase(),
          first_name: parsed.data.first_name ?? null,
          last_name: parsed.data.last_name ?? null,
          company: parsed.data.company ?? null,
          custom_fields: parsed.data.custom_fields ?? {},
          source: "manual",
        },
        { onConflict: "email" },
      )
      .select()
      .single();
    if (error) return fail(error.message, 500);
    return ok({ contact: data }, 201);
  });
}
