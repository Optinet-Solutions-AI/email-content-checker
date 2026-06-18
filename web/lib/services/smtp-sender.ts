/**
 * smtp-sender.ts — send + verify email through a connected SMTP mailbox
 *
 * Inputs:  an EmailAccount row + a message (to, subject, body)
 * Outputs: send result (messageId) or a verified-connection boolean
 * Used by: lib/generation/run-campaign.ts, app/api/email-accounts/test
 */
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { EmailAccount } from "../db";
import { logger } from "../logger";
import { withRetry } from "../retry";

function transportFor(account: EmailAccount): Transporter {
  return nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: account.smtp_user, pass: account.smtp_pass },
  });
}

/** Verify SMTP credentials without sending anything. */
export async function verifyAccount(account: EmailAccount): Promise<boolean> {
  const transport = transportFor(account);
  try {
    await transport.verify();
    logger.info({ account: account.email }, "smtp.verify ok");
    return true;
  } catch (err) {
    logger.warn({ account: account.email, err: (err as Error).message }, "smtp.verify failed");
    return false;
  } finally {
    transport.close();
  }
}

export interface SendInput {
  to: string;
  subject: string;
  /** Plain-text body. We send text/plain to match the 1:1 personalized intent. */
  text: string;
}

export interface SendResult {
  messageId: string;
}

export async function sendEmail(account: EmailAccount, input: SendInput): Promise<SendResult> {
  const transport = transportFor(account);
  try {
    return await withRetry(
      async () => {
        const info = await transport.sendMail({
          from: account.email,
          to: input.to,
          subject: input.subject,
          text: input.text,
        });
        logger.info(
          { from: account.email, to: input.to, messageId: info.messageId },
          "smtp.send ok",
        );
        return { messageId: info.messageId };
      },
      { label: "smtp.send" },
    );
  } finally {
    transport.close();
  }
}
