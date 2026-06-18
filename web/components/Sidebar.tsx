/**
 * Sidebar.tsx — primary navigation rail
 *
 * Inputs:  current pathname
 * Outputs: nav links + brand mark
 * Used by: app/layout.tsx
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview", glyph: "◔" },
  { href: "/library", label: "Templates", glyph: "❏" },
  { href: "/checker", label: "Checker", glyph: "✓" },
];

export function Sidebar() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-[var(--surface)] px-4 py-7 sm:flex">
      <Link href="/" className="mb-9 flex items-center gap-2.5 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-[15px] font-semibold text-white">
          C
        </span>
        <span className="font-display text-lg leading-none">
          Content Studio
          <span className="block text-[10px] font-sans uppercase tracking-[0.18em] text-muted">
            variations &amp; checker
          </span>
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive(item.href)
                ? "bg-accent-soft font-semibold text-accent"
                : "text-muted hover:bg-[var(--paper)] hover:text-ink"
            }`}
          >
            <span className="w-4 text-center text-[13px] opacity-70">{item.glyph}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <p className="mt-auto px-3 text-[11px] leading-relaxed text-muted">
        v0.2 · up for improvement.
        <br />
        Generate &amp; check content.
      </p>
    </aside>
  );
}
