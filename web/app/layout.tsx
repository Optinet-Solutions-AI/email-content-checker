/**
 * layout.tsx — root layout (fonts, sidebar shell)
 *
 * Inputs:  page children
 * Outputs: the app frame (sidebar + content area)
 * Used by: every route
 */
import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Outreach — Unique-Content Email",
  description: "Send personalized email where every message is unique.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10 sm:py-12">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
