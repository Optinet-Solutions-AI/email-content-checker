/**
 * response.ts — uniform API envelope { success, data | error }
 *
 * Inputs:  data or an error
 * Outputs: NextResponse JSON in the project's standard shape
 * Used by: every Route Handler
 */
import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

/** Wrap a handler body so thrown errors become a uniform 500 envelope. */
export async function handle(
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return fail(message, 500);
  }
}
