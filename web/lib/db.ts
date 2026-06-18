/**
 * db.ts — Supabase service-role client (the single DB handle)
 *
 * Inputs:  SUPABASE_URL / SUPABASE_SERVICE_KEY from env
 * Outputs: a configured Supabase client + shared row types
 * Used by: lib/generation/*, app/api/*, scripts/* (server-only — never the client)
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "./config";

export const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Row types (mirror db/schema.sql) ─────────────────────────────────────────

export interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  custom_fields: Record<string, string>;
  source: "manual" | "csv";
  unsubscribed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  ai_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus =
  | "draft"
  | "generating"
  | "ready"
  | "sending"
  | "sent"
  | "failed";

export interface Campaign {
  id: string;
  name: string;
  template_id: string;
  sender_account_id: string | null;
  status: CampaignStatus;
  created_at: string;
}

export type MessageStatus = "draft" | "sent" | "failed";

export interface Message {
  id: string;
  campaign_id: string;
  contact_id: string;
  subject: string;
  body: string;
  status: MessageStatus;
  edited_by_operator: boolean;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailAccount {
  id: string;
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  daily_cap: number;
  verified_at: string | null;
  created_at: string;
}

// ── Content Variation Studio (migration 002 — the active tool) ────────────────

export interface ContentTemplate {
  id: string;
  name: string;
  brand: string | null;
  locale: string;
  html: string;
  text: string;
  is_seed: boolean;
  seed_key: string | null;
  created_at: string;
  updated_at: string;
}

export type RiskLevel = "clean" | "caution" | "high-risk";

export interface ContentVariation {
  id: string;
  template_id: string;
  label: string;
  subject: string;
  text: string;
  html: string;
  notes: string | null;
  sanitized: boolean;
  risk_score: number;
  risk_level: RiskLevel;
  created_at: string;
}
