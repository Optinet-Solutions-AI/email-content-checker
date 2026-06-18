/**
 * MobileNav.tsx — top navigation bar shown on phones (the sidebar is desktop-only)
 *
 * Inputs:  current pathname
 * Outputs: sticky brand + nav row, visible below the `sm` breakpoint
 * Used by: app/layout.tsx
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/library", label: "Templates" },
  { href: "/checker", label: "Checker" },
];

export function MobileNav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[var(--surface)]/95 px-4 py-3 backdrop-blur sm:hidden">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-xs font-semibold text-white">
          C
        </span>
        <span className="font-display text-base leading-none">Content Studio</span>
      </Link>
      <nav className="mt-2.5 flex gap-1.5 overflow-x-auto">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive(item.href) ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
