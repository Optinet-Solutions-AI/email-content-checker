/**
 * route.ts — GET /api/health (liveness check)
 *
 * Inputs:  none
 * Outputs: { success, data: { status, time } }
 * Used by: uptime checks, smoke tests
 */
import { ok } from "@/lib/response";

export const runtime = "nodejs";

export async function GET() {
  return ok({ status: "ok", time: new Date().toISOString() });
}
