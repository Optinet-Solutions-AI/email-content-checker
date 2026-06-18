-- 002_content_studio.sql — content variation studio tables
--
-- Adds the content tool (variation generator + checker). The email-sending tables
-- from 001 (contacts/campaigns/messages/email_accounts) remain but are dormant.
--
-- Run in the Supabase SQL editor (or psql). Idempotent (IF NOT EXISTS).

create extension if not exists "pgcrypto";

-- ── content_templates — the source samples (5 seeds + custom) ────────────────
create table if not exists content_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  brand      text,                                   -- e.g. "Lucky7even"
  locale     text not null default 'en',             -- en / de / it …
  html       text not null default '',               -- the sample as HTML
  text       text not null default '',               -- plain-text version (checked + raw view)
  is_seed    boolean not null default false,         -- true = shipped sample
  seed_key   text unique,                            -- stable key for upserting seeds
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── content_variations — AI-generated rewordings/reformats of a template ─────
create table if not exists content_variations (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references content_templates(id) on delete cascade,
  label       text not null default 'Variation',
  subject     text not null default '',
  text        text not null default '',
  html        text not null default '',
  notes       text,                                  -- what the AI changed / why
  sanitized   boolean not null default true,         -- generated with deliverability sanitising on
  risk_score  integer not null default 0,            -- from the deliverability checker (0–100)
  risk_level  text not null default 'clean',         -- clean / caution / high-risk
  created_at  timestamptz not null default now()
);

create index if not exists content_variations_template_idx
  on content_variations (template_id, created_at desc);

-- updated_at touch (reuse the function from 001 if present; define if not)
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists content_templates_touch on content_templates;
create trigger content_templates_touch before update on content_templates
  for each row execute function touch_updated_at();
