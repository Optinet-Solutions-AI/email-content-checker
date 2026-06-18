/**
 * ui.tsx — shared presentational primitives (dumb, no business logic)
 *
 * Inputs:  props
 * Outputs: Button, Card, PageHeader, Field, Textarea, Badge, StatusPill, Spinner, Empty, Alert
 * Used by: every dashboard page
 */
"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

// ── Button ────────────────────────────────────────────────────────────────────
type Variant = "primary" | "ghost" | "danger" | "subtle";
const BTN: Record<Variant, string> = {
  primary: "bg-accent text-white hover:brightness-110 disabled:opacity-50",
  ghost: "border border-line bg-[var(--surface)] text-ink hover:bg-[var(--paper)]",
  danger: "border border-[var(--danger-soft)] bg-[var(--danger-soft)] text-danger hover:brightness-95",
  subtle: "text-muted hover:text-ink hover:bg-[var(--paper)]",
};

export function Button({
  variant = "primary",
  loading,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${BTN[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

// ── Page header ─────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.9rem] leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-xl text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

// ── Field (label + input) ─────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </label>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input font-mono leading-relaxed ${props.className ?? ""}`} />;
}

// ── Badges + status ─────────────────────────────────────────────────────────
const STATUS_TONE: Record<string, string> = {
  draft: "bg-[var(--paper)] text-muted border-line",
  generating: "bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn-soft)]",
  ready: "bg-accent-soft text-accent border-accent-soft",
  sending: "bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn-soft)]",
  sent: "bg-accent-soft text-accent border-accent-soft",
  failed: "bg-[var(--danger-soft)] text-danger border-[var(--danger-soft)]",
};

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.draft;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${tone}`}>
      {status}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "danger" | "warn" }) {
  const tones = {
    neutral: "bg-[var(--paper)] text-muted border-line",
    accent: "bg-accent-soft text-accent border-accent-soft",
    danger: "bg-[var(--danger-soft)] text-danger border-[var(--danger-soft)]",
    warn: "bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn-soft)]",
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

// ── Spinner / Empty / Alert ───────────────────────────────────────────────────
export function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 px-6 py-14 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "info"; children: ReactNode }) {
  const cls =
    kind === "error"
      ? "bg-[var(--danger-soft)] text-danger"
      : "bg-accent-soft text-accent";
  return <div className={`rounded-lg px-3.5 py-2.5 text-sm ${cls}`}>{children}</div>;
}
