# CLAUDE.md — Content Variation Studio

> Source of truth for this project. Loaded into every Claude Code session.
> Keep concise. Update when reality drifts.

---

## Project Overview

A professional tool that **generates fresh variations of HTML email content and checks each one for
deliverability**. You start from a sample template (5 are shipped, or add your own), and AI rewrites it
with **new words and a new format** while keeping the same offer, brand, and language. Every variation
is scored against the operator's deliverability rules (spam words, currency symbols, hype). **It is a
content generator + checker — NOT an email sender.**

**The core promise:** pick a template → AI produces N reworded/reformatted variations → each is
auto-checked for deliverability → copy/export the HTML or plain text. Plus a standalone **Checker** to
score any pasted content.

- **Stack:** TypeScript + Next.js 14 (App Router) + Tailwind CSS — single app for frontend, API, and logic.
- **Database:** Supabase (Postgres) — `content_templates` + `content_variations`.
- **AI copy:** Google **Gemini** via the `@google/genai` SDK, `gemini-2.5-flash` with **thinking disabled** (`thinkingBudget: 0`) for low latency at full model quality. Pluggable behind `lib/services/`; writes variations as JSON.
- **Deliverability checker:** `lib/deliverability.ts` — pure, runs client-side (live) and server-side (steers the AI).
- **Hosting:** Vercel (Next.js app).

> Scope guardrails (YAGNI): this is a **content studio**, not a sender. Output is HTML + raw text for
> the operator to copy/use elsewhere. Don't add sending/scheduling/contacts back into the active flow.
>
> **DORMANT (built, not in the active nav):** an email-sending pipeline (contacts → CSV → per-recipient
> AI → SMTP send → reply tracking) lives under `app/api/{contacts,campaigns,messages,email-accounts}`,
> `app/{contacts,campaigns,mailboxes,templates}`, `lib/services/{smtp-sender,csv,email-*}`,
> `lib/generation/{generate-message,run-campaign,render-template}`, `scripts/send-campaign.ts`, and the
> `contacts/campaigns/messages/email_accounts` tables. Kept for possible future use; not wired to the UI.

---

## How It Works

```
1. TEMPLATES (/library) — your saved samples: the 5 shipped seeds (POST /content-templates/seed)
   plus any you add (paste HTML or text; the missing side is derived). This page is a LIBRARY ONLY —
   no generation here. Each card opens the Checker preloaded (/checker?template=<id>).
   ↓

2. CHECK (/checker — the engine) — pick a saved template OR paste your own content (subject + text/HTML).
   The original is scored LIVE by lib/deliverability.ts (spam words, $€£¥ symbols, hype).
   ↓

3. GENERATE improved — choose how many (1–10) → Generate. Each variation is rewritten by Gemini with
   new words + a new layout (a distinct "angle" each), then SANITISED and auto-repaired: the checker
   re-scores it and, if not clean, the findings are fed back to the AI (up to 2 passes) to drive it to
   a clean score. Calls run in parallel. Text-first; styled HTML is opt-in (else derived from text).
   ↓

4. USE — read the text, flip to Preview/HTML when needed, copy/export. Generation happens ONLY on
   click and results are in-memory (POST /api/generate) — nothing is generated or saved unasked.
```

Generation is deliverability-FIRST: a variation only earns its place if it improves on the original.
Merge placeholders (`${name}`, `{{field}}`) are ignored by the checker so they never read as spam/currency.

---

## Architecture

```
┌──────────────────────────────────────┐
│  Next.js App  (web/)                 │  one app, server + client
│                                      │
│  app/                                │
│   ├─ Dashboard pages                 │  React server + client components
│   └─ api/  (Route Handlers)          │  thin: validate → call lib/
│                                      │
│  lib/                                │
│   ├─ services/  (external APIs)      │  one file per provider (gemini, smtp, csv…)
│   ├─ generation/ (template → body)   │  the brain: merge + AI-slot fill
│   └─ db/config/response/…            │  shared helpers
│                                      │
│  scripts/send-campaign.ts            │  CLI runner for long sends
└─────────────┬────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│  Supabase (Postgres)                 │  source of truth
└──────────────────────────────────────┘
```

### Golden Rules

1. **Client components are DUMB** — display data, fire actions. Zero business logic. Never import `lib/db.ts` or `lib/services/*` (server-only — `import "server-only"` enforces this).
2. **Route Handlers are THIN** — validate input (zod), call into `lib/`, return `{ success, data | error }`. No business logic inline.
3. **`lib/` is the BRAIN** — all generation, all external calls, all rules.
4. **DB is the MEMORY** — `contacts`, `templates`, `campaigns`, `messages` are the source of truth; no client-side state duplication.
5. **One file = one responsibility** — one service per provider, one route file per resource, generation logic isolated from sending logic.
6. **Generation is idempotent** — regenerating a message overwrites its draft body cleanly; sending a sent message is a no-op.
7. **Never burn paid calls or sender reputation without confirmation** — AI generation and real email sends cost quota or deliverability. If a step fails, fix and ask before re-running.

---

## Directory Structure

```
HTML CONTENT GEN/
│
├── CLAUDE.md                       ← THIS FILE — source of truth
├── README.md                       ← Human setup instructions
├── .env.example                    ← Template for .env (no secrets)
├── .env                            ← Real secrets (gitignored)
├── .gitignore
│
├── web/                            ← Next.js app (frontend + API + logic)
│   ├── package.json · tsconfig.json · next.config.mjs
│   ├── tailwind.config.ts · postcss.config.mjs
│   │
│   ├── app/                        ← App Router
│   │   ├── layout.tsx · globals.css
│   │   ├── page.tsx                ← dashboard home
│   │   ├── contacts/ · templates/ · campaigns/   ← dashboard pages
│   │   └── api/                    ← thin route handlers (validate → lib/)
│   │       ├── health
│   │       ├── contacts/{route, import, [id]}        ← list/create, CSV import, edit/delete
│   │       ├── templates/{route, [id]}               ← CRUD email templates
│   │       ├── campaigns/{route, [id]/{route, generate, send}}
│   │       ├── messages/{[id]/{route, regenerate}}   ← preview / hand-edit / regen one message
│   │       ├── deliverability/check                  ← POST: spam/deliverability lint a draft
│   │       └── email-accounts/{route, test, [id]}    ← connect/test/remove a sender mailbox
│   │
│   ├── lib/                        ← Server-side TS modules
│   │   ├── config.ts               ← zod-parsed env → `env` singleton
│   │   ├── db.ts                   ← Supabase service-role client (server-only)
│   │   ├── logger.ts               ← structured logger
│   │   ├── retry.ts                ← exponential backoff wrapper
│   │   ├── response.ts             ← uniform { success, data | error }
│   │   ├── deliverability.ts       ← PURE spam/deliverability checker (client + server safe)
│   │   ├── html.ts                 ← PURE stripHtml / textToHtml helpers
│   │   ├── seed/
│   │   │     content-templates.ts  ← the 5 shipped sample templates (HTML + text)
│   │   ├── services/
│   │   │     gemini.ts             ← AI: generateCopy + generateJson (variations)
│   │   │     smtp-sender.ts        ← [dormant] nodemailer send
│   │   │     csv.ts                ← [dormant] CSV contact parse
│   │   └── generation/
│   │         generate-variation.ts ← template → N reworded/reformatted variations (ACTIVE)
│   │         render-template.ts    ← [dormant] merge fields
│   │         generate-message.ts   ← [dormant] per-recipient body
│   │         run-campaign.ts       ← [dormant] generate/send a campaign
│   │
│   └── scripts/
│       └── send-campaign.ts        ← CLI: long generate/send runs
│
├── db/                             ← DB schema + migrations
│   ├── schema.sql                  ← Authoritative table definitions
│   └── migrations/
│
├── workflows/                      ← WAT SOPs (markdown, one per task)
├── skills/                         ← Project-scoped Claude Code skills
└── docs/                           ← Architecture, decisions, weekly status
    ├── architecture.md
    ├── decisions/
    └── status/                     ← YYYY-Www.md per ISO week
```

### File-naming conventions

- Generation logic: `lib/generation/<verb>-<object>.ts` (e.g. `generate-message.ts`).
- External-API clients: `lib/services/<provider>.ts` — one provider per file.
- Route Handlers: `app/api/<resource>/[<param>/]route.ts` — REST resource = folder.
- Workflows: `workflows/<verb>_<object>.md` — imperative.
- Skills: `skills/<kebab-name>/SKILL.md`.
- Status logs: `docs/status/YYYY-Www.md` (ISO week).

### Required header on every TS file

```typescript
/**
 * <filename> — <one-line purpose>
 *
 * Inputs:  <what it reads>
 * Outputs: <what it writes>
 * Used by: <who calls this>
 */
```

Non-negotiable. Open any file, read 4 lines, know what it does and how it fits.

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Postgres + server writes (service role) | yes |
| `GOOGLE_GENAI_API_KEY` / `GOOGLE_GENAI_MODEL` | Gemini AI copy (free ≈1,500/day; default `gemini-2.5-flash`) | yes |
| `EMAIL_SENDING_PAUSED_UNTIL` | Global kill switch — halts ALL sends while in the future | no |
| `APP_ENV` · `PORT` · `LOG_LEVEL` | runtime | yes/no |

> **Sender mailboxes are NOT env vars** — they're rows in `email_accounts` (SMTP host/port/user/pass),
> connected/tested/removed in the dashboard. The `.env` file lives at **the repo root** (not inside `web/`);
> Next.js and the CLI script both load from there. See `.env.example` for the canonical list.

---

## Database Schema (essentials)

Authoritative SQL: `db/schema.sql` (content tables = migration `002`). Summary:

### Active — Content Studio

**`content_templates`** — `id` · `name` · `brand` · `locale` · `html` · `text` (plain) · `is_seed` bool · `seed_key` (unique, for upserting the 5 samples) · `created_at` / `updated_at`.

**`content_variations`** — `id` · `template_id` FK · `label` · `subject` · `text` · `html` · `notes` (what the AI changed) · `sanitized` bool · `risk_score` int · `risk_level` (`clean`/`caution`/`high-risk`) · `created_at`.

### Dormant — email-sending pipeline (built, not used by the active flow)

### `contacts`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `email` | text | required, validated on import |
| `first_name` / `last_name` | text | |
| `company` | text | |
| `custom_fields` | jsonb | arbitrary merge data from CSV columns |
| `source` | text | `manual` or `csv` |
| `unsubscribed` | bool | suppresses sending |
| `created_at` / `updated_at` | timestamptz | |

### `templates`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `subject` | text | may contain `{{merge_fields}}` |
| `body` | text | static text + `{{merge_fields}}` + `[[ai_slots]]` |
| `ai_instructions` | text | guidance passed to Gemini for the AI slots (tone, length, goal) |
| `created_at` / `updated_at` | timestamptz | |

### `campaigns`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `template_id` | uuid FK → templates | |
| `sender_account_id` | uuid FK → email_accounts | which mailbox sends |
| `status` | text | `draft` / `generating` / `ready` / `sending` / `sent` / `failed` |
| `created_at` | timestamptz | |

### `messages` — one per recipient per campaign
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `campaign_id` | uuid FK → campaigns | |
| `contact_id` | uuid FK → contacts | |
| `subject` / `body` | text | the **unique** rendered output (AI + merge) |
| `status` | text | `draft` / `sent` / `failed` |
| `edited_by_operator` | bool | true if hand-edited after generation |
| `sent_at` | timestamptz | |
| `last_error` | text | from last failed send/generate |
| `created_at` / `updated_at` | timestamptz | |

### `email_accounts` — sender mailboxes (SMTP)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `email` | text | the From address |
| `smtp_host` / `smtp_port` | text/int | |
| `smtp_user` / `smtp_pass` | text | pass stored encrypted / secret-managed |
| `daily_cap` | int | safety limit on sends/day |
| `verified_at` | timestamptz | set by the `/test` connection check |
| `created_at` | timestamptz | |

---

## API Routes

**Active — Content Studio:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Liveness check |
| `/api/content-templates` | GET / POST | List / add a content template (paste HTML or text) |
| `/api/content-templates/seed` | POST | Upsert the 5 shipped samples (idempotent on `seed_key`) |
| `/api/content-templates/:id` | GET / PATCH / DELETE | Inspect / edit / remove a template |
| `/api/generate` | POST | **The engine.** Generate improved, sanitised, clean-checked variations from `{ text, subject?, name?, brand?, locale?, count≤10, withHtml? }`. In-memory (not saved). |
| `/api/deliverability/check` | POST | Lint `{ subject, body }` for spam words / symbols / hype |
| `/api/content-templates/:id/variations` | GET / POST | Legacy save-to-DB generate path (the Checker uses `/api/generate`) |
| `/api/variations/:id` | DELETE | Remove a saved variation |

**Dormant — email-sending pipeline (built, not in the active nav):**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/contacts` | GET / POST | List / add a contact |
| `/api/contacts/import` | POST | Upload + parse a CSV → bulk-insert contacts |
| `/api/contacts/:id` | GET / PATCH / DELETE | Inspect / edit / remove a contact |
| `/api/templates` | GET / POST | List / create an email template |
| `/api/templates/:id` | GET / PATCH / DELETE | Inspect / edit / remove a template |
| `/api/campaigns` | GET / POST | List / create a campaign (template + audience + sender) |
| `/api/campaigns/:id` | GET | Campaign detail + per-status message counts |
| `/api/campaigns/:id/generate` | POST | Generate unique messages for every recipient (AI) |
| `/api/campaigns/:id/send` | POST | Send all `draft` messages via the sender mailbox |
| `/api/messages/:id` | GET / PATCH | Preview / hand-edit one generated message |
| `/api/messages/:id/regenerate` | POST | Re-run AI generation for one message |
| `/api/email-accounts` | GET / POST | List / connect a sender mailbox |
| `/api/email-accounts/test` | POST | Verify SMTP credentials (no send) |
| `/api/email-accounts/:id` | DELETE | Remove a mailbox |

All responses: `{ success: true, data: {...} }` or `{ success: false, error: "..." }`.

---

## Skills (Claude Code, project-scoped)

Located in `skills/`. Invoke with `/<skill-name>`. *(Build these as the project grows — start empty.)*

| Skill | What it does |
|-------|--------------|
| `template-author` | Help draft/refine an email template (merge fields + AI slots + instructions) |
| `content-tuner` | Review/improve generated copy for tone, length, and uniqueness |
| `campaign-runner` | Walk the operator through generate → review → send for a campaign |
| `status-reporter` | Read recent activity + write the weekly `docs/status/` entry |

See `skills/README.md` for how each is wired.

---

## Status Updates

- **Weekly:** `docs/status/YYYY-Www.md` — one file per ISO week. Sections: *Done*, *In progress*, *Blocked*, *Numbers* (contacts, messages generated, sent, failed), *Next week*.
- **Daily (when active):** append a `### YYYY-MM-DD` block to the current week's file.
- **End-of-task report (on request / end of day):** plain-English, NON-technical — one outcome per line, what got done and what it MEANS for the operator. Never a commit/code-change log. Two sections: **task for today** (one bullet per accomplishment + a `Result: …` line + a `Still to do next time: …` line) and **pending/still in progress**.

The status file is the canonical record of *what happened*. CLAUDE.md is *how the system works*.

---

## What Should NOT Change Without Explicit Request

- Database schema (write a migration; don't ALTER live tables ad-hoc).
- `.env` variable names (frontend + API + scripts all reference them).
- API response envelope `{ success, data | error }`.
- `messages.status` / `campaigns.status` enum values (UI + logic filter on these).
- The template markup contract: `{{merge_field}}` for data swaps, `[[ai_slot]]` for AI-rewritten sections.

---

## Known Constraints

- **Gemini (AI copy)**: free tier = 1,500 req/day on Flash. One generate call per recipient — a 1,000-contact campaign is 1,000 calls. Batch with care; respect the daily cap or pay past it.
- **Email sending**: via connected `email_accounts` (SMTP). New mailboxes should be warmed up; respect `daily_cap`. Skip `unsubscribed` contacts. Global kill switch: `EMAIL_SENDING_PAUSED_UNTIL`.
- **Deliverability**: personalized 1:1 sends, not bulk blast. Keep volume sane per mailbox; SPF/DKIM/DMARC on the sending domain are the operator's responsibility.
- **Serverless timeouts**: don't run a full campaign generate/send inside a Vercel Route Handler (60s cap). Large runs go through `scripts/send-campaign.ts` (CLI) or a chunked/queued approach.
- **CSV import**: validate every row (email format, required fields); reject/flag bad rows rather than inserting garbage.
- **Compliance**: include an unsubscribe path and honor it; don't email purchased/non-consented lists (CAN-SPAM / GDPR — not gated in code).
- **Deliverability linter** (`lib/deliverability.ts`): pure, no I/O — runs client-side (instant editor feedback) AND server-side (steers the AI). Rules: spam-word list w/ alternatives, currency symbols (`$ € £ ¥` → USD/EUR/GBP/JPY), hype signals (CAPS, multiple `!`, emojis, urgency, aggressive CTAs, gambling). It advises; it does **not** block sending. Extend the word lists here, not inline elsewhere.

---

## Coding Standards

### Do
- One TS module = one responsibility (one service, one generation step, one route file).
- Every file starts with the required docstring header (see Directory Structure).
- All external API calls go through `lib/services/<provider>.ts` — never inline.
- All external calls have retry w/ exponential backoff (`lib/retry.ts`).
- Log every external call (AI, SMTP) with timestamp + outcome via `lib/logger.ts`.
- Strict mode on (`tsc --noEmit` clean before commit). Use zod at every boundary.
- Write the workflow markdown FIRST, code SECOND.

### Don't
- Don't call external services from client components.
- Don't import `lib/db.ts` or `lib/services/*` outside `app/api/`, `lib/`, or `scripts/`. The `import "server-only"` guard fails the build if you try.
- Don't store secrets in `NEXT_PUBLIC_*` env vars or commit them anywhere.
- Don't rerun a paid AI generation or a real send without checking with the operator.
- Don't send without honoring `unsubscribed` and `EMAIL_SENDING_PAUSED_UNTIL`.
- Don't add new dependencies without updating `package.json` and noting why in the commit.

---

## Quick Reference

| Task | Command (run from `web/` unless noted) |
|------|---------|
| Install deps | `npm install` |
| Start dev server | `npm run dev` (http://localhost:3000) |
| Type-check | `npm run typecheck` |
| Lint | `npm run lint` |
| Generate + send a campaign (CLI) | `npm run send:campaign -- <campaign_id>` |
| Run tests | `npm test` (vitest) |
| Apply DB migration | run the SQL in Supabase SQL editor (or `psql`) |
| Production deploy | push `main` → Vercel auto-deploys (build first) |

---

## Commit Messages (Conventional Commits)

Format: `<type>(<scope>): <summary>`

Types: `feat`, `fix`, `refactor`, `style`, `perf`, `docs`, `chore`, `test`.
Scopes for this project: `web`, `api`, `generation`, `template`, `db`, `skill`, `workflow`, `docs`, `config`.

Rules:
- Imperative mood, lowercase after colon, no trailing period, ≤72 chars.
- Body explains *why* if non-obvious.

After every change, end the response with:

````
---
**Suggested commit:**
```
<type>(<scope>): <summary>
```
````
