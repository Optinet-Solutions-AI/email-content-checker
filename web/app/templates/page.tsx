/**
 * page.tsx — Templates (list + editor with live deliverability + field hints)
 *
 * Inputs:  /api/templates*
 * Outputs: the template authoring view
 * Used by: route "/templates"
 */
"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/components/api";
import { DeliverabilityPanel } from "@/components/DeliverabilityPanel";
import { Alert, Badge, Button, Card, Empty, Field, PageHeader, Spinner, Textarea } from "@/components/ui";
import { extractAiSlots, extractMergeFields } from "@/lib/generation/render-template";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  ai_instructions: string | null;
}

const BLANK: Template = {
  id: "",
  name: "",
  subject: "",
  body: "Hi {{first_name}},\n\n[[a warm one-line opener that references their company]]\n\n[[one sentence on how we could help their business specifically]]\n\nWould you be open to a quick look?\n\nBest,\nYour name",
  ai_instructions: "Friendly, concise, professional. 60–90 words total. No hype.",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await apiGet<{ templates: Template[] }>("/api/templates");
      setTemplates(data.templates);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: editing.name,
        subject: editing.subject,
        body: editing.body,
        ai_instructions: editing.ai_instructions,
      };
      if (editing.id) await apiPatch(`/api/templates/${editing.id}`, payload);
      else await apiPost("/api/templates", payload);
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: Template) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await apiDelete(`/api/templates/${t.id}`);
    if (editing?.id === t.id) setEditing(null);
    await load();
  }

  const merge = editing ? extractMergeFields(`${editing.subject}\n${editing.body}`) : [];
  const slots = editing ? extractAiSlots(`${editing.subject}\n${editing.body}`) : [];

  return (
    <>
      <PageHeader
        title="Templates"
        subtitle="Fixed structure, unique copy. Use {{merge_fields}} for data and [[ai_slots]] for AI-written sections."
        action={<Button onClick={() => setEditing({ ...BLANK })}>+ New template</Button>}
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      {editing ? (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-4">
            <Field label="Template name">
              <input
                className="input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Cold intro — agencies"
              />
            </Field>
            <Field label="Subject" hint="Supports {{merge_fields}} and [[ai_slots]].">
              <input
                className="input"
                value={editing.subject}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
              />
            </Field>
            <Field label="Body">
              <Textarea
                rows={12}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </Field>
            <Field label="AI instructions" hint="Tone, length, and goal for the [[ai_slots]].">
              <Textarea
                rows={3}
                value={editing.ai_instructions ?? ""}
                onChange={(e) => setEditing({ ...editing, ai_instructions: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <Button loading={saving} onClick={save}>Save template</Button>
              <Button variant="subtle" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <DeliverabilityPanel subject={editing.subject} body={editing.body} />
            <Card>
              <p className="field-label mb-2">Detected fields</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {merge.length ? merge.map((m) => <Badge key={m} tone="accent">{`{{${m}}}`}</Badge>) : <span className="text-sm text-muted">No merge fields.</span>}
              </div>
              <p className="field-label mb-2">AI slots ({slots.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {slots.length ? slots.map((s, i) => <Badge key={i} tone="warn">{s.length > 28 ? s.slice(0, 28) + "…" : s}</Badge>) : <span className="text-sm text-muted">No AI slots.</span>}
              </div>
              <p className="mt-3 text-xs text-muted">
                Each AI slot is one Gemini call per recipient. Available merge keys: email,
                first_name, last_name, full_name, company, plus any CSV columns.
              </p>
            </Card>
          </div>
        </div>
      ) : templates === null ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : templates.length === 0 ? (
        <Empty title="No templates yet" hint="Create one to define the email structure and AI sections." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-lg">{t.name}</p>
                <button onClick={() => remove(t)} className="text-xs text-danger hover:underline">Delete</button>
              </div>
              <p className="mt-1 text-sm text-muted">{t.subject || "(no subject)"}</p>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap font-mono text-xs text-muted">{t.body}</p>
              <div className="mt-3">
                <Button variant="ghost" onClick={() => setEditing(t)}>Edit</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
