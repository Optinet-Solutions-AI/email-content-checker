# Unique-Content Email Dashboard

A professional dashboard for sending **personalized email to a contact list you own**, where
**every message body is unique**. You author a template with a fixed structure; AI rewrites the
marked sections per recipient, so no two sends are identical. Built-in deliverability linting keeps
copy out of the spam folder.

> See [`CLAUDE.md`](./CLAUDE.md) for the authoritative architecture + conventions.

## The flow

1. **Contacts** — add by hand or import a CSV.
2. **Template** — static text + `{{merge_fields}}` + `[[ai_slots]]` (AI-written per recipient).
3. **Generate** — Gemini writes a unique email for each contact → drafts.
4. **Review** — preview, hand-edit, or regenerate any message. Live deliverability score.
5. **Send** — dispatch through a connected SMTP mailbox.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Google Gemini · Nodemailer.

## Setup

```bash
# 1. Secrets — copy the template to the REPO ROOT and fill it in
cp .env.example .env        # SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_GENAI_API_KEY

# 2. Database — run the schema in the Supabase SQL editor
#    db/schema.sql

# 3. App
cd web
npm install
npm run dev                 # http://localhost:3000
```

Connect a sending mailbox from the **Mailboxes** page (SMTP host/port/user/pass) — these are stored
in the `email_accounts` table, not in `.env`.

## Commands (from `web/`)

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Type-check | `npm run typecheck` |
| Lint | `npm run lint` |
| Generate + send a campaign (CLI, no timeout) | `npm run send:campaign -- <campaign_id>` |
| Tests | `npm test` |

## Deliverability

Every template and generated message is linted live for spam-trigger words (with safer
alternatives), currency symbols (`$ € £ ¥` → `USD / EUR / GBP / JPY`), and hype signals
(CAPS, excess `!`, emojis, false urgency, aggressive CTAs, gambling vocab). The AI is also
instructed to avoid all of these while writing. See [`web/lib/deliverability.ts`](./web/lib/deliverability.ts).

> v0.1 — up for improvement. Audience segmentation, open/reply tracking, scheduled sends,
> and per-day cap accounting are intentionally deferred.
