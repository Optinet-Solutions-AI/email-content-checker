/**
 * HtmlPreview.tsx — render untrusted email HTML safely in a sandboxed iframe
 *
 * Inputs:  html string + optional height
 * Outputs: an isolated preview (no scripts, no same-origin access)
 * Used by: Templates workspace + Checker
 */
"use client";

export function HtmlPreview({ html, height = 360 }: { html: string; height?: number }) {
  return (
    <iframe
      title="HTML preview"
      srcDoc={html}
      sandbox=""
      className="w-full rounded-lg border border-line bg-white"
      style={{ height }}
    />
  );
}

/** Small copy-to-clipboard button used across content views. */
import { useState } from "react";
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="rounded-md border border-line bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-muted hover:text-ink"
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}
