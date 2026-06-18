/**
 * page.tsx — Templates library (5 seeds + custom add)
 *
 * Inputs:  /api/content-templates*
 * Outputs: template grid, "Load samples", "Add custom" form
 * Used by: route "/library"
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/components/api";
import { Alert, Badge, Button, Card, Empty, Field, PageHeader, Spinner, Textarea } from "@/components/ui";
import { lintDeliverability } from "@/lib/deliverability";

interface Template {
  id: string;
  name: string;
  brand: string | null;
  locale: string;
  text: string;
  is_seed: boolean;
}

export default function LibraryPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", brand: "", locale: "en", mode: "html" as "html" | "text", content: "" });

  async function load() {
    try {
      const d = await apiGet<{ templates: Template[] }>("/api/content-templates");
      setTemplates(d.templates);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function loadSamples() {
    setBusy(true);
    setError("");
    try {
      await apiPost("/api/content-templates/seed");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiPost("/api/content-templates", {
        name: form.name,
        brand: form.brand || undefined,
        locale: form.locale || "en",
        [form.mode]: form.content,
      });
      setForm({ name: "", brand: "", locale: "en", mode: "html", content: "" });
      setAdding(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: Template) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    await apiDelete(`/api/content-templates/${t.id}`);
    await load();
  }

  const hasSeeds = templates?.some((t) => t.is_seed);

  return (
    <>
      <PageHeader
        title="Templates"
        subtitle="Your saved content samples. Open one in the Checker to check it and generate improved variations, or add your own."
        action={
          <div className="flex gap-2">
            {!hasSeeds && (
              <Button variant="ghost" loading={busy} onClick={loadSamples}>
                Load sample templates
              </Button>
            )}
            <Button onClick={() => setAdding((v) => !v)}>+ Add custom</Button>
          </div>
        }
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      {adding && (
        <Card className="mb-5">
          <form onSubmit={addCustom} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My promo email" />
            </Field>
            <Field label="Brand (optional)">
              <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label="Locale">
              <input className="input" value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })} placeholder="en / de / it" />
            </Field>
            <Field label="Content type">
              <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as "html" | "text" })}>
                <option value="html">Paste HTML</option>
                <option value="text">Plain text</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={form.mode === "html" ? "HTML" : "Text"} hint="The other format is derived automatically.">
                <Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>Add template</Button>
            </div>
          </form>
        </Card>
      )}

      {templates === null ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : templates.length === 0 ? (
        <Empty title="No templates yet" hint="Load the 5 sample templates, or add your own content." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const risk = lintDeliverability("", t.text, { ignore: t.brand ? [t.brand] : [] });
            return (
              <Card key={t.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base leading-tight">{t.name}</p>
                  <Badge>{t.locale}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted">{t.brand ?? "—"}{t.is_seed ? " · sample" : " · custom"}</p>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted">{t.text}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge tone={risk.level === "high-risk" ? "danger" : risk.level === "caution" ? "warn" : "accent"}>
                    risk {risk.score}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {!t.is_seed && (
                      <button onClick={() => remove(t)} className="text-xs text-danger hover:underline">Delete</button>
                    )}
                    <Link href={`/checker?template=${t.id}`}>
                      <Button variant="ghost">Check &amp; improve</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
