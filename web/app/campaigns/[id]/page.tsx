/**
 * page.tsx — Campaign detail (generate, review/edit/regenerate, send)
 *
 * Inputs:  /api/campaigns/:id (+ generate, send, /api/messages/:id*)
 * Outputs: the campaign workspace
 * Used by: route "/campaigns/[id]"
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/components/api";
import { DeliverabilityPanel } from "@/components/DeliverabilityPanel";
import { Alert, Badge, Button, Card, Empty, PageHeader, Spinner, StatusPill, Textarea } from "@/components/ui";
import { lintDeliverability } from "@/lib/deliverability";

interface MessageRow {
  id: string;
  subject: string;
  body: string;
  status: string;
  edited_by_operator: boolean;
  last_error: string | null;
  contacts: { email: string; first_name: string | null; company: string | null; unsubscribed: boolean } | null;
}
interface Detail {
  campaign: {
    id: string;
    name: string;
    status: string;
    templates: { name: string } | null;
    email_accounts: { email: string } | null;
  };
  messages: MessageRow[];
  counts: { draft: number; sent: number; failed: number; total: number };
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "generate" | "send">("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setDetail(await apiGet<Detail>(`/api/campaigns/${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setBusy("generate");
    setError("");
    setNotice("");
    try {
      const r = await apiPost<{ generated: number; failed: number }>(`/api/campaigns/${id}/generate`);
      setNotice(`Generated ${r.generated} message(s)${r.failed ? `, ${r.failed} failed` : ""}.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function send() {
    if (!confirm("Send all draft messages now?")) return;
    setBusy("send");
    setError("");
    setNotice("");
    try {
      const r = await apiPost<{ sent: number; failed: number; capped: boolean }>(`/api/campaigns/${id}/send`);
      setNotice(`Sent ${r.sent}${r.failed ? `, ${r.failed} failed` : ""}${r.capped ? " (daily cap hit — run again later)" : ""}.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  if (detail === null) {
    return (
      <div className="flex justify-center py-24">{error ? <Alert>{error}</Alert> : <Spinner />}</div>
    );
  }

  const { campaign, messages, counts } = detail;
  const hasSender = Boolean(campaign.email_accounts);

  return (
    <>
      <Link href="/campaigns" className="mb-4 inline-block text-sm text-muted hover:text-ink">
        ← Campaigns
      </Link>
      <PageHeader
        title={campaign.name}
        subtitle={`${campaign.templates?.name ?? "—"} · sender: ${campaign.email_accounts?.email ?? "none assigned"}`}
        action={
          <div className="flex items-center gap-2">
            <StatusPill status={campaign.status} />
            <Button variant="ghost" loading={busy === "generate"} onClick={generate}>
              Generate
            </Button>
            <Button
              loading={busy === "send"}
              onClick={send}
              disabled={!hasSender || counts.draft === 0}
            >
              Send {counts.draft > 0 ? `(${counts.draft})` : ""}
            </Button>
          </div>
        }
      />

      {!hasSender && (
        <div className="mb-4"><Alert kind="info">No sender mailbox assigned — connect one in Mailboxes, then recreate or edit this campaign to send.</Alert></div>
      )}
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert kind="info">{notice}</Alert></div>}

      <div className="mb-5 flex gap-2">
        <Badge>{counts.total} total</Badge>
        <Badge>{counts.draft} draft</Badge>
        <Badge tone="accent">{counts.sent} sent</Badge>
        {counts.failed > 0 && <Badge tone="danger">{counts.failed} failed</Badge>}
      </div>

      {messages.length === 0 ? (
        <Empty
          title="No messages yet"
          hint="Click Generate to write a unique email for every non-unsubscribed contact."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {messages.map((m) => (
            <MessageCard key={m.id} message={m} onChanged={load} />
          ))}
        </div>
      )}
    </>
  );
}

function MessageCard({ message, onChanged }: { message: MessageRow; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(message.subject);
  const [body, setBody] = useState(message.body);
  const [busy, setBusy] = useState<"" | "save" | "regen">("");
  const dirty = subject !== message.subject || body !== message.body;
  const risk = lintDeliverability(message.subject, message.body);

  async function save() {
    setBusy("save");
    try {
      await apiPatch(`/api/messages/${message.id}`, { subject, body });
      await onChanged();
    } finally {
      setBusy("");
    }
  }
  async function regenerate() {
    setBusy("regen");
    try {
      const r = await apiPost<{ message: { subject: string; body: string } }>(
        `/api/messages/${message.id}/regenerate`,
      );
      setSubject(r.message.subject);
      setBody(r.message.body);
      await onChanged();
    } finally {
      setBusy("");
    }
  }

  return (
    <Card className="p-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {message.contacts?.email ?? "unknown"}
            {message.contacts?.company ? <span className="font-normal text-muted"> · {message.contacts.company}</span> : null}
          </span>
          <span className="block truncate text-sm text-muted">{message.subject || "(no subject)"}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {message.edited_by_operator && <Badge>edited</Badge>}
          {risk.level !== "clean" && <Badge tone={risk.level === "high-risk" ? "danger" : "warn"}>risk {risk.score}</Badge>}
          <StatusPill status={message.status} />
          <span className="text-muted">{open ? "▴" : "▾"}</span>
        </span>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-line px-5 py-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col gap-3">
            {message.last_error && <Alert>{message.last_error}</Alert>}
            <label className="block">
              <span className="field-label">Subject</span>
              <input className="input mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="block">
              <span className="field-label">Body</span>
              <Textarea className="mt-1.5" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <Button loading={busy === "save"} disabled={!dirty} onClick={save}>Save edit</Button>
              <Button variant="ghost" loading={busy === "regen"} onClick={regenerate}>Regenerate (AI)</Button>
            </div>
          </div>
          <DeliverabilityPanel subject={subject} body={body} />
        </div>
      )}
    </Card>
  );
}
