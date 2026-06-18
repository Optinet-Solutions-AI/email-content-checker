/**
 * DeliverabilityPanel.tsx — live spam/deliverability feedback (client-side)
 *
 * Inputs:  subject + body strings
 * Outputs: a score gauge + list of findings with safer suggestions
 * Used by: template editor + message review
 *
 * Imports the PURE lib/deliverability linter directly — instant, no round-trip.
 */
"use client";

import { useMemo } from "react";
import { lintDeliverability, type Severity } from "@/lib/deliverability";

const LEVEL_META = {
  clean: { label: "Clean", color: "var(--ok)", bg: "var(--accent-soft)" },
  caution: { label: "Caution", color: "var(--warn)", bg: "var(--warn-soft)" },
  "high-risk": { label: "High risk", color: "var(--danger)", bg: "var(--danger-soft)" },
} as const;

const DOT: Record<Severity, string> = {
  high: "var(--danger)",
  medium: "var(--warn)",
  low: "var(--muted)",
};

export function DeliverabilityPanel({
  subject,
  body,
  ignore,
}: {
  subject: string;
  body: string;
  ignore?: string[];
}) {
  const ignoreKey = (ignore ?? []).join("|");
  const report = useMemo(
    () => lintDeliverability(subject, body, { ignore }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subject, body, ignoreKey],
  );
  const meta = LEVEL_META[report.level];

  return (
    <div className="card overflow-hidden p-0">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: meta.bg }}
      >
        <span className="text-sm font-semibold" style={{ color: meta.color }}>
          Deliverability · {meta.label}
        </span>
        <span className="font-mono text-xs" style={{ color: meta.color }}>
          risk {report.score}/100
        </span>
      </div>

      <div className="px-4 py-3">
        {report.findings.length === 0 ? (
          <p className="text-sm text-muted">No spam triggers detected. Looks deliverable.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {report.findings.map((f, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: DOT[f.severity] }}
                />
                <span>
                  <span className="text-ink">{f.message}</span>{" "}
                  {f.suggestion && <span className="text-muted">{f.suggestion}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
