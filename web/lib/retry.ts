/**
 * retry.ts — exponential-backoff wrapper for flaky external calls
 *
 * Inputs:  an async fn + options (attempts, base delay, label)
 * Outputs: the fn's resolved value, or throws after the last attempt
 * Used by: lib/services/* (every external API call)
 */
import "server-only";
import { logger } from "./logger";

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  label?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 400, label = "operation" }: RetryOptions = {},
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === attempts;
      logger.warn(
        { label, attempt, attempts, err: (err as Error)?.message },
        `${label} failed${isLast ? " (final)" : ", retrying"}`,
      );
      if (isLast) break;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastErr;
}
