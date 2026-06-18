-- schema.sql — Authoritative table definitions for the Unique-Content Email Dashboard
--
-- Inputs:  run in Supabase SQL editor (or psql) against the project Postgres
-- Outputs: contacts, templates, campaigns, messages, email_accounts tables
-- Used by: web/lib/db.ts (row types mirror these)
--
-- Idempotent-ish: uses IF NOT EXISTS so it can be re-applied safely.

create extension if not exists "pgcrypto";

-- ── contacts ────────────────────────────────────────────────────────────────
-- email is stored lowercased by the app, so a plain UNIQUE works as an upsert
-- target (lets CSV re-imports / manual adds upsert on email).
create table if not exists contacts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  first_name    text,
  last_name     text,
  company       text,
  custom_fields jsonb not null default '{}'::jsonb,  -- arbitrary merge data from CSV
  source        text not null default 'manual'       -- 'manual' | 'csv'
                  check (source in ('manual', 'csv')),
  unsubscribed  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── templates ───────────────────────────────────────────────────────────────
-- body uses two markers:
--   {{merge_field}}  -> swapped for contact data (no AI)
--   [[ai_slot]]      -> rewritten per recipient by the AI
create table if not exists templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  subject         text not null default '',
  body            text not null default '',
  ai_instructions text,                               -- tone / length / goal for AI slots
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── email_accounts (sender mailboxes, SMTP) ──────────────────────────────────
create table if not exists email_accounts (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,                          -- the From address
  smtp_host   text not null,
  smtp_port   integer not null default 587,
  smtp_user   text not null,
  smtp_pass   text not null,                          -- TODO: encrypt at rest / secret-manage
  daily_cap   integer not null default 50,            -- safety limit on sends/day
  verified_at timestamptz,                            -- set by the /test connection check
  created_at  timestamptz not null default now()
);

-- ── campaigns ────────────────────────────────────────────────────────────────
create table if not exists campaigns (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  template_id       uuid not null references templates(id) on delete restrict,
  sender_account_id uuid references email_accounts(id) on delete set null,
  status            text not null default 'draft'
                      check (status in ('draft','generating','ready','sending','sent','failed')),
  created_at        timestamptz not null default now()
);

-- ── messages (one per recipient per campaign — the UNIQUE rendered output) ────
create table if not exists messages (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references campaigns(id) on delete cascade,
  contact_id         uuid not null references contacts(id) on delete cascade,
  subject            text not null default '',
  body               text not null default '',
  status             text not null default 'draft'
                       check (status in ('draft','sent','failed')),
  edited_by_operator boolean not null default false,
  sent_at            timestamptz,
  last_error         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (campaign_id, contact_id)                    -- idempotent generation
);

create index if not exists messages_campaign_idx on messages (campaign_id);
create index if not exists messages_status_idx on messages (campaign_id, status);

-- ── updated_at touch trigger ─────────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists contacts_touch on contacts;
create trigger contacts_touch before update on contacts
  for each row execute function touch_updated_at();

drop trigger if exists templates_touch on templates;
create trigger templates_touch before update on templates
  for each row execute function touch_updated_at();

drop trigger if exists messages_touch on messages;
create trigger messages_touch before update on messages
  for each row execute function touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- CONTENT VARIATION STUDIO (migration 002) — the active tool.
-- The email-sending tables above (contacts/campaigns/messages/email_accounts)
-- remain defined but are DORMANT (no longer used by the app's nav/flow).
-- ════════════════════════════════════════════════════════════════════════════

-- content_templates — source samples (5 shipped seeds + custom).
create table if not exists content_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  brand      text,
  locale     text not null default 'en',
  html       text not null default '',
  text       text not null default '',
  is_seed    boolean not null default false,
  seed_key   text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- content_variations — AI rewordings/reformats of a template, with a checker score.
create table if not exists content_variations (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references content_templates(id) on delete cascade,
  label       text not null default 'Variation',
  subject     text not null default '',
  text        text not null default '',
  html        text not null default '',
  notes       text,
  sanitized   boolean not null default true,
  risk_score  integer not null default 0,
  risk_level  text not null default 'clean',
  created_at  timestamptz not null default now()
);

create index if not exists content_variations_template_idx
  on content_variations (template_id, created_at desc);

drop trigger if exists content_templates_touch on content_templates;
create trigger content_templates_touch before update on content_templates
  for each row execute function touch_updated_at();
