/**
 * page.tsx — Mailboxes (connect / test / remove SMTP sender accounts)
 *
 * Inputs:  /api/email-accounts*
 * Outputs: sender mailbox management
 * Used by: route "/mailboxes"
 */
"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/components/api";
import { Alert, Badge, Button, Card, Empty, Field, PageHeader, Spinner } from "@/components/ui";

interface Account {
  id: string;
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  daily_cap: number;
  verified_at: string | null;
}

const BLANK = {
  email: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  daily_cap: "50",
};

export default function MailboxesPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState("");
  const [form, setForm] = useState({ ...BLANK });

  async function load() {
    try {
      const data = await apiGet<{ accounts: Account[] }>("/api/email-accounts");
      setAccounts(data.accounts);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const r = await apiPost<{ verified: boolean }>("/api/email-accounts", {
        ...form,
        smtp_port: Number(form.smtp_port),
        daily_cap: Number(form.daily_cap),
      });
      setNotice(r.verified ? "Mailbox connected and verified." : "Mailbox saved, but SMTP verification failed — check the credentials.");
      setForm({ ...BLANK });
      setAdding(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function test(a: Account) {
    setTesting(a.id);
    setNotice("");
    setError("");
    try {
      const r = await apiPost<{ verified: boolean }>("/api/email-accounts/test", { id: a.id });
      setNotice(`${a.email}: ${r.verified ? "verified ✓" : "verification failed"}.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTesting("");
    }
  }

  async function remove(a: Account) {
    if (!confirm(`Remove ${a.email}?`)) return;
    await apiDelete(`/api/email-accounts/${a.id}`);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Mailboxes"
        subtitle="Connected SMTP accounts that send your campaigns. Warm new mailboxes before high volume."
        action={<Button onClick={() => setAdding((v) => !v)}>+ Connect mailbox</Button>}
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert kind="info">{notice}</Alert></div>}

      {adding && (
        <Card className="mb-5">
          <form onSubmit={connect} className="grid gap-4 sm:grid-cols-2">
            <Field label="From address">
              <input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@yourdomain.com" />
            </Field>
            <Field label="SMTP host">
              <input required className="input" value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} placeholder="smtp.yourhost.com" />
            </Field>
            <Field label="SMTP port" hint="587 (STARTTLS) or 465 (SSL).">
              <input required className="input" value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} />
            </Field>
            <Field label="Daily cap" hint="Max sends per run for this mailbox.">
              <input required className="input" value={form.daily_cap} onChange={(e) => setForm({ ...form, daily_cap: e.target.value })} />
            </Field>
            <Field label="SMTP username">
              <input required className="input" value={form.smtp_user} onChange={(e) => setForm({ ...form, smtp_user: e.target.value })} />
            </Field>
            <Field label="SMTP password">
              <input required type="password" className="input" value={form.smtp_pass} onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>Connect &amp; verify</Button>
            </div>
          </form>
        </Card>
      )}

      {accounts === null ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : accounts.length === 0 ? (
        <Empty title="No mailboxes connected" hint="Connect an SMTP mailbox to send campaigns." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {accounts.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{a.email}</p>
                <p className="text-sm text-muted">{a.smtp_host}:{a.smtp_port} · cap {a.daily_cap}/run</p>
              </div>
              <div className="flex items-center gap-2">
                {a.verified_at ? <Badge tone="accent">verified</Badge> : <Badge tone="warn">unverified</Badge>}
                <Button variant="ghost" loading={testing === a.id} onClick={() => test(a)}>Test</Button>
                <button onClick={() => remove(a)} className="text-xs text-danger hover:underline">Remove</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
