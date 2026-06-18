/**
 * page.tsx — Overview (Content Studio home: counts + the generate→check flow)
 *
 * Inputs:  /api/content-templates
 * Outputs: at-a-glance counts + workflow guide + checker note
 * Used by: route "/"
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/components/api";
import { Card, PageHeader, Spinner } from "@/components/ui";

const STEPS = [
  ["Templates", "Start from the 5 samples or add your own content.", "/library"],
  ["Generate", "AI rewrites with new words and a new format.", "/library"],
  ["Check", "Every variation is scored for deliverability.", "/checker"],
  ["Copy / Export", "Grab the HTML or plain text and use it.", "/library"],
] as const;

export default function OverviewPage() {
  const [templates, setTemplates] = useState<{ is_seed: boolean }[] | null>(null);

  useEffect(() => {
    apiGet<{ templates: { is_seed: boolean }[] }>("/api/content-templates")
      .then((d) => setTemplates(d.templates))
      .catch(() => setTemplates([]));
  }, []);

  const total = templates?.length;
  const seeds = templates?.filter((t) => t.is_seed).length;
  const custom = templates ? templates.length - (seeds ?? 0) : undefined;

  const stats = [
    { label: "Templates", value: total, href: "/library" },
    { label: "Sample sets", value: seeds, href: "/library" },
    { label: "Custom added", value: custom, href: "/library" },
  ];

  return (
    <>
      <PageHeader
        title="Content Studio"
        subtitle="Generate fresh variations of your HTML samples — new words, new format — and check every one for deliverability."
      />

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition hover:-translate-y-0.5 hover:shadow-card">
              <p className="field-label">{s.label}</p>
              <p className="mt-2 font-display text-4xl">
                {s.value === undefined ? <Spinner /> : s.value}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-lg">How it works</h2>
      <ol className="grid gap-3 md:grid-cols-4">
        {STEPS.map(([title, desc, href], i) => (
          <Link key={title} href={href}>
            <Card className="h-full transition hover:-translate-y-0.5">
              <span className="font-mono text-xs text-accent">0{i + 1}</span>
              <p className="mt-1 font-display text-base">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{desc}</p>
            </Card>
          </Link>
        ))}
      </ol>

      <Card className="mt-6 border-dashed">
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">Deliverability is built in.</span> Generation
          rewords spam triggers (bonus, free spins, 100%, claim now…), swaps currency symbols
          (<span className="font-mono">$ € £ ¥</span> → <span className="font-mono">USD / EUR / GBP / JPY</span>),
          and drops hype. The <Link href="/checker" className="text-accent underline">Checker</Link> scores
          any content you paste.
        </p>
      </Card>
    </>
  );
}
