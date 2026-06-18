/**
 * logger.ts — single structured (pino) logger for all server code
 *
 * Inputs:  LOG_LEVEL from env
 * Outputs: a shared pino logger instance
 * Used by: services, generation, route handlers, scripts
 */
import "server-only";
import pino from "pino";
import { env } from "./config";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: undefined, // drop pid/hostname noise
});
