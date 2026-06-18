/**
 * route.ts — POST /api/contacts/import (CSV upload → bulk upsert)
 *
 * Inputs:  multipart form-data with a `file`, OR JSON { csv: "<raw text>" }
 * Outputs: { inserted, errors, totalRows }
 * Used by: dashboard contacts page (CSV import)
 */
import { db } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";
import { parseContactsCsv } from "@/lib/services/csv";

export const runtime = "nodejs";

async function readCsv(req: Request): Promise<string | null> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (file && typeof file !== "string") return await file.text();
    return null;
  }
  const body = await req.json().catch(() => null);
  return body?.csv ?? null;
}

export async function POST(req: Request) {
  return handle(async () => {
    const raw = await readCsv(req);
    if (!raw) return fail("No CSV provided (send a `file` upload or { csv } body).");

    const { contacts, errors, totalRows } = parseContactsCsv(raw);
    if (contacts.length === 0) {
      return ok({ inserted: 0, errors, totalRows });
    }

    const rows = contacts.map((c) => ({ ...c, source: "csv" as const }));
    const { data, error } = await db
      .from("contacts")
      .upsert(rows, { onConflict: "email" })
      .select("id");
    if (error) return fail(error.message, 500);

    return ok({ inserted: data?.length ?? 0, errors, totalRows });
  });
}
