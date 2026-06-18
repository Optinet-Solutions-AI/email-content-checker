/**
 * route.ts — POST /api/messages/:id/regenerate (re-run AI for one recipient)
 *
 * Inputs:  path id
 * Outputs: the regenerated message
 * Used by: dashboard campaign detail page (Regenerate on one message)
 */
import { db, type Contact, type Template } from "@/lib/db";
import { ok, fail, handle } from "@/lib/response";
import { generateMessage } from "@/lib/generation/generate-message";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: { id: string } };

export async function POST(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { data: message, error } = await db
      .from("messages")
      .select("*, campaigns(template_id)")
      .eq("id", params.id)
      .single();
    if (error || !message) return fail("Message not found", 404);

    const templateId = (message.campaigns as { template_id: string } | null)?.template_id;
    if (!templateId) return fail("Campaign/template missing for message", 500);

    const [{ data: template }, { data: contact }] = await Promise.all([
      db.from("templates").select("*").eq("id", templateId).single(),
      db.from("contacts").select("*").eq("id", message.contact_id).single(),
    ]);
    if (!template || !contact) return fail("Template or contact not found", 404);

    const regenerated = await generateMessage(template as Template, contact as Contact);
    const { data: updated, error: uErr } = await db
      .from("messages")
      .update({
        subject: regenerated.subject,
        body: regenerated.body,
        status: "draft",
        edited_by_operator: false,
        last_error: null,
      })
      .eq("id", params.id)
      .select()
      .single();
    if (uErr) return fail(uErr.message, 500);
    return ok({ message: updated });
  });
}
