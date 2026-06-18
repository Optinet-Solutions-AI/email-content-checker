/**
 * tailwind.config.ts — Tailwind theme + content paths
 *
 * Inputs:  app/ + components/ class usage
 * Outputs: generated utility classes
 * Used by: PostCSS / Next.js build
 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        surface: "var(--surface)",
        danger: "var(--danger)",
        ok: "var(--ok)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,24,22,0.04), 0 8px 24px -12px rgba(26,24,22,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
