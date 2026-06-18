/**
 * page.tsx — Contacts (list, search, manual add, CSV import, edit/unsub/delete)
 *
 * Inputs:  /api/contacts*
 * Outputs: the contacts management view
 * Used by: route "/contacts"
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "@/components/api";
import { Alert, Badge, Button, Card, Empty, Field, PageHeader, Spinner } from "@/components/ui";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  source: "manual" | "csv";
  unsubscribed: boolean;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "", company: "" });
  const [saving, setSaving] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (q = "") => {
    try {
      const data = await apiGet<{ contacts: Contact[] }>(
        `/api/contacts${q ? `?search=${encodeURIComponent(q)}` : ""}`,
      );
      setContacts(data.contacts);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
  }, [search, load]);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiPost("/api/contacts", form);
      setForm({ email: "", first_name: "", last_name: "", company: "" });
      setAdding(false);
      await load(search);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("Importing…");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await apiUpload<{ inserted: number; errors: unknown[]; totalRows: number }>(
        "/api/contacts/import",
        fd,
      );
      setImportMsg(
        `Imported ${r.inserted} of ${r.totalRows} rows${r.errors.length ? ` · ${r.errors.length} skipped` : ""}.`,
      );
      await load(search);
    } catch (e) {
      setError((e as Error).message);
      setImportMsg("");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function toggleUnsub(c: Contact) {
    await apiPatch(`/api/contacts/${c.id}`, { unsubscribed: !c.unsubscribed });
    await load(search);
  }

  async function remove(c: Contact) {
    if (!confirm(`Delete ${c.email}?`)) return;
    await apiDelete(`/api/contacts/${c.id}`);
    await load(search);
  }

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="People you'll send to. Email is the merge key; extra CSV columns become {{merge_fields}}."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              ↑ Import CSV
            </Button>
            <Button onClick={() => setAdding((v) => !v)}>+ Add contact</Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="hidden"
            />
          </div>
        }
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {importMsg && <div className="mb-4"><Alert kind="info">{importMsg}</Alert></div>}

      {adding && (
        <Card className="mb-5">
          <form onSubmit={addContact} className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input
                required
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@acme.com"
              />
            </Field>
            <Field label="Company">
              <input
                className="input"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Acme Co."
              />
            </Field>
            <Field label="First name">
              <input
                className="input"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </Field>
            <Field label="Last name">
              <input
                className="input"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>
                Save contact
              </Button>
            </div>
          </form>
        </Card>
      )}

      <input
        className="input mb-4 max-w-sm"
        placeholder="Search name, email, company…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {contacts === null ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : contacts.length === 0 ? (
        <Empty title="No contacts yet" hint="Add one manually or import a CSV with an email column." />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-[var(--paper)]">
                  <td className="px-4 py-3">
                    <span className={c.unsubscribed ? "text-muted line-through" : ""}>{c.email}</span>
                    {c.unsubscribed && <span className="ml-2"><Badge tone="danger">unsubscribed</Badge></span>}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.company || "—"}</td>
                  <td className="px-4 py-3"><Badge>{c.source}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleUnsub(c)} className="mr-3 text-xs text-muted hover:text-ink">
                      {c.unsubscribed ? "Resubscribe" : "Unsubscribe"}
                    </button>
                    <button onClick={() => remove(c)} className="text-xs text-danger hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
