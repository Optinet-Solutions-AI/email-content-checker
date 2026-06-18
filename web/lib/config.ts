/**
 * config.ts — zod-parsed environment → typed `env` singleton
 *
 * Inputs:  process.env (loaded from repo-root .env by next.config / dotenv)
 * Outputs: validated `env` object; throws at boot if required vars are missing
 * Used by: every server-side module that needs configuration
 */
import "server-only";
import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  GOOGLE_GENAI_API_KEY: z.string().min(1).optional(),
  GOOGLE_GENAI_MODEL: z.string().default("gemini-2.5-flash"),

  EMAIL_SENDING_PAUSED_UNTIL: z.string().optional(),

  APP_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

/** True while the global send kill-switch is set to a future timestamp. */
export function sendingIsPaused(now = new Date()): boolean {
  const until = env.EMAIL_SENDING_PAUSED_UNTIL;
  if (!until) return false;
  const ts = new Date(until);
  return !Number.isNaN(ts.getTime()) && ts > now;
}
