/**
 * csv.ts — parse + validate an uploaded contact CSV
 *
 * Inputs:  raw CSV text (headers required)
 * Outputs: { contacts, errors } — valid contact rows + per-row rejection reasons
 * Used by: app/api/contacts/import
 *
 * Recognised headers (case-insensitive, flexible): email (required),
 * first_name/first, last_name/last, company. Any other column becomes a
 * custom_field, usable as a {{merge_field}} in templates.
 */
import "server-only";
import Papa from "papaparse";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedContact {
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  custom_fields: Record<string, string>;
}

export interface CsvRowError {
  row: number; // 1-based data row
  reason: string;
}

export interface CsvParseResult {
  contacts: ParsedContact[];
  errors: CsvRowError[];
  totalRows: number;
}

const ALIASES: Record<string, "email" | "first_name" | "last_name" | "company"> = {
  email: "email",
  "e-mail": "email",
  "email address": "email",
  first_name: "first_name",
  first: "first_name",
  firstname: "first_name",
  "first name": "first_name",
  last_name: "last_name",
  last: "last_name",
  lastname: "last_name",
  "last name": "last_name",
  company: "company",
  organization: "company",
  org: "company",
  business: "company",
};

export function parseContactsCsv(raw: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const contacts: ParsedContact[] = [];
  const errors: CsvRowError[] = [];
  const rows = parsed.data;

  rows.forEach((row, i) => {
    const rowNum = i + 1;
    const known: Record<string, string> = {};
    const custom: Record<string, string> = {};

    for (const [rawKey, rawVal] of Object.entries(row)) {
      const val = (rawVal ?? "").toString().trim();
      if (!val) continue;
      const canonical = ALIASES[rawKey.trim().toLowerCase()];
      if (canonical) known[canonical] = val;
      else custom[rawKey.trim()] = val;
    }

    const email = (known.email ?? "").toLowerCase();
    if (!email) {
      errors.push({ row: rowNum, reason: "missing email" });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      errors.push({ row: rowNum, reason: `invalid email: ${email}` });
      return;
    }

    contacts.push({
      email,
      first_name: known.first_name ?? null,
      last_name: known.last_name ?? null,
      company: known.company ?? null,
      custom_fields: custom,
    });
  });

  return { contacts, errors, totalRows: rows.length };
}
