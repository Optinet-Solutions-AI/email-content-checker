/**
 * page.tsx — Campaigns (list + create)
 *
 * Inputs:  /api/campaigns, /api/templates, /api/email-accounts
 * Outputs: campaign list + create form
 * Used by: route "/campaigns"
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/components/api";
import { Alert, Button, Card, Empty, Field, PageHeader, Spinner, StatusPill } from "@/components/ui";

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  templates: { name: string } | null;
}
interface Template { id: string; name: string }
interface Account { id: string; email: string }

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", template_id: "", sender_account_id: "" });

  async function load() {
    try {
      const [c, t, a] = await Promise.all([
        apiGet<{ campaigns: Campaign[] }>("/api/campaigns"),
        apiGet<{ templates: Template[] }>("/api/templates"),
        apiGet<{ accounts: Account[] }>("/api/email-accounts"),
      ]);
      setCampaigns(c.campaigns);
      setTemplates(t.templates);
      setAccounts(a.accounts);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiPost("/api/campaigns", {
        name: form.name,
        template_id: form.template_id,
        sender_account_id: form.sender_account_id || null,
      });
      setForm({ name: "", template_id: "", sender_account_id: "" });
      setCreating(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="A template + your audience. Generate unique drafts, review, then send."
        action={
          <Button onClick={() => setCreating((v) => !v)} disabled={templates.length === 0}>
            + New campaign
          </Button>
        }
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {templates.length === 0 && (
        <div className="mb-4"><Alert kind="info">Create a template first — campaigns need one.</Alert></div>
      )}

      {creating && (
        <Card className="mb-5">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-3">
            <Field label="Campaign name">
              <input
                required
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="June — agencies"
              />
            </Field>
            <Field label="Template">
              <select
                required
                className="input"
                value={form.template_id}
                onChange={(e) => setForm({ ...form, template_id: e.target.value })}
              >
                <option value="">Select…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Sender mailbox" hint={accounts.length ? undefined : "Connect one in Mailboxes."}>
              <select
                className="input"
                value={form.sender_account_id}
                onChange={(e) => setForm({ ...form, sender_account_id: e.target.value })}
              >
                <option value="">Assign later…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.email}</option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-3">
              <Button type="submit" loading={saving}>Create campaign</Button>
            </div>
          </form>
        </Card>
      )}

      {campaigns === null ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : campaigns.length === 0 ? (
        <Empty title="No campaigns yet" hint="Create one to start generating personalized emails." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="flex items-center justify-between gap-4 transition hover:-translate-y-0.5">
                <div>
                  <p className="font-display text-lg">{c.name}</p>
                  <p className="text-sm text-muted">{c.templates?.name ?? "—"}</p>
                </div>
                <StatusPill status={c.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
