/**
 * next.config.mjs — Next.js build/runtime config
 *
 * Inputs:  none (static config)
 * Outputs: Next.js configuration object
 * Used by: Next.js build + dev server
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// .env lives at the REPO ROOT, one level above web/.
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "..", ".env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pino", "nodemailer"],
  },
};

export default nextConfig;
