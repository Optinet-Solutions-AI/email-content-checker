/**
 * page.tsx — Checker (the engine): check content, then generate improved variations
 *
 * Inputs:  /api/content-templates (source picker), /api/generate (rewrite+check)
 * Outputs: original deliverability score + improved, re-checked variations
 * Used by: route "/checker" (optionally "/checker?template=<id>")
 *
 * Flow: pick a saved template OR paste your own → see the original's check →
 * Generate → AI rewrites it (new words + layout), sanitised to a clean score.
 */
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/components/api";
import { ContentView } from "@/components/ContentView";
import { DeliverabilityPanel } from "@/components/DeliverabilityPanel";
import { HtmlPreview } from "@/components/HtmlPreview";
import { Alert, Badge, Button, Card, Empty, Field, PageHeader, Spinner, Textarea } from "@/components/ui";
import { stripHtml } from "@/lib/html";

interface Template {
  id: string;
  name: string;
  brand: string | null;
  locale: string;
  html: string;
  text: string;
}
interface Variation {
  label: string;
  subject: string;
  text: string;
  html: string;
  notes: string;
  report: { score: number; level: "clean" | "caution" | "high-risk" };
}

function riskTone(level: string) {
  return level === "high-risk" ? "danger" : level === "caution" ? "warn" : "accent";
}

function Checker() {
  const params = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isHtml, setIsHtml] = useState(false);

  const [count, setCount] = useState(3);
  const [withHtml, setWithHtml] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [error, setError] = useState("");

  // Load saved templates for the source picker; preselect ?template=<id> if present.
  useEffect(() => {
    apiGet<{ templates: Template[] }>("/api/content-templates")
      .then((d) => {
        setTemplates(d.templates);
        const pre = params.get("template");
        if (pre) {
          const t = d.templates.find((x) => x.id === pre);
          if (t) pickTemplate(t);
        }
      })
      .catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickTemplate(t: Template | null) {
    setSelected(t);
    setVariations([]);
    if (t) {
      setContent(t.text);
      setIsHtml(false);
      setSubject("");
    }
  }

  // Body used for checking + as the source text for generation.
  const body = useMemo(() => (isHtml ? stripHtml(content) : content), [isHtml, content]);
  const previewHtml = selected ? selected.html : isHtml ? content : "";

  async function generate() {
    if (!body.trim()) {
      setError("Add some content first.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const r = await apiPost<{ variations: Variation[] }>("/api/generate", {
        text: body,
        subject: subject || undefined,
        name: selected?.name,
        brand: selected?.brand ?? undefined,
        locale: selected?.locale,
        count: Math.min(Math.max(count, 1), 10),
        withHtml,
      });
      setVariations(r.variations);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Checker"
        subtitle="Check a message, then generate improved variations of it — rewritten and sanitised to a clean deliverability score."
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Source + controls */}
        <div className="flex flex-col gap-4">
          <Field label="Source" hint="Pick a saved template, or choose “Paste your own”.">
            <select
              className="input"
              value={selected?.id ?? ""}
              onChange={(e) => pickTemplate(templates.find((t) => t.id === e.target.value) ?? null)}
            >
              <option value="">Paste your own content…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.brand ? ` · ${t.brand}` : ""}</option>
              ))}
            </select>
          </Field>

          {selected && (
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="accent">{selected.brand ?? "template"}</Badge>
              <Badge>{selected.locale}</Badge>
              <span className="text-xs text-muted">Loaded — edit below before generating if you like.</span>
            </div>
          )}

          <Field label="Subject (optional)">
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
          </Field>

          <Field label="Content">
            <Textarea rows={14} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste your email text or HTML here…" />
          </Field>

          {!selected && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={isHtml} onChange={(e) => setIsHtml(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              This content is HTML (strip tags before checking)
            </label>
          )}

          <Card className="bg-[var(--paper)]">
            <div className="flex flex-wrap items-end gap-5">
              <Field label="Variations" hint="1–10">
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="input w-24"
                  value={count}
                  onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 10))}
                />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
                <input type="checkbox" checked={withHtml} onChange={(e) => setWithHtml(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                Also generate styled HTML <span className="text-muted">(slower)</span>
              </label>
              <div className="ml-auto pb-1">
                <Button loading={generating} onClick={generate}>Generate improved</Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">
              Each variation is rewritten for new words + a new layout, then auto-repaired until the
              checker reads clean. 3–6 is the sweet spot.
            </p>
          </Card>
        </div>

        {/* Original check + preview */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="field-label mb-2">Original</p>
            <DeliverabilityPanel subject={subject} body={body} />
          </div>
          {previewHtml.trim() && (
            <Card>
              <p className="field-label mb-2">Original preview</p>
              <HtmlPreview html={previewHtml} height={260} />
            </Card>
          )}
        </div>
      </div>

      {/* Generated variations */}
      {(generating || variations.length > 0) && (
        <>
          <h2 className="mb-3 mt-9 text-lg">
            Improved variations {variations.length > 0 && <span className="text-muted">· {variations.length}</span>}
          </h2>
          {generating && variations.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Rewriting & checking…</div>
          ) : (
            <div className="flex flex-col gap-3">
              {variations.map((v, i) => (
                <Card key={i} className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-semibold">{v.label}</p>
                      <Badge tone={riskTone(v.report.level)}>risk {v.report.score} · {v.report.level}</Badge>
                    </div>
                    {v.notes && <p className="mb-2 text-sm text-muted"><span className="font-semibold text-ink">Changes: </span>{v.notes}</p>}
                    {v.subject && <p className="mb-2 text-sm"><span className="field-label">Subject </span>{v.subject}</p>}
                    <ContentView html={v.html} text={v.text} />
                  </div>
                  <DeliverabilityPanel subject={v.subject} body={v.text} />
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function CheckerPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Spinner /></div>}>
      <Checker />
    </Suspense>
  );
}
