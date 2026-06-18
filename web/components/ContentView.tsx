/**
 * ContentView.tsx — tabbed Text / Preview / HTML view for a piece of content
 *
 * Inputs:  html + text strings
 * Outputs: Text shown first; Preview (sandboxed iframe) and HTML only when clicked
 * Used by: the Checker (original + variations)
 */
"use client";

import { useState } from "react";
import { CopyButton, HtmlPreview } from "./HtmlPreview";

export function ContentView({ html, text }: { html: string; text: string }) {
  const [tab, setTab] = useState<"text" | "preview" | "html">("text");
  const tabs: [typeof tab, string][] = [
    ["text", "Text"],
    ["preview", "Preview"],
    ["html", "HTML"],
  ];
  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${tab === t ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto">
          <CopyButton value={tab === "text" ? text : html} label={`Copy ${tab === "text" ? "text" : "HTML"}`} />
        </span>
      </div>
      {tab === "text" && (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-[var(--paper)] p-3 text-sm leading-relaxed">{text}</pre>
      )}
      {tab === "preview" && <HtmlPreview html={html} />}
      {tab === "html" && (
        <pre className="max-h-96 overflow-auto rounded-lg border border-line bg-[var(--paper)] p-3 font-mono text-xs leading-relaxed">{html}</pre>
      )}
    </div>
  );
}
