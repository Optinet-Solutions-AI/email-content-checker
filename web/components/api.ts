/**
 * api.ts — tiny client-side fetch wrapper (unwraps the { success, data } envelope)
 *
 * Inputs:  a path under /api + optional body
 * Outputs: the `data` payload, or throws with the server's error string
 * Used by: client dashboard components (the ONLY way they touch the server)
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json().catch(() => ({ success: false, error: "Bad response" }));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json.data as T;
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPatch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => request<T>(path, { method: "DELETE" });

/** Multipart upload (CSV import) — no JSON content-type. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(path, { method: "POST", body: form });
  const json = await res.json().catch(() => ({ success: false, error: "Bad response" }));
  if (!res.ok || !json.success) throw new Error(json.error || `Upload failed (${res.status})`);
  return json.data as T;
}
