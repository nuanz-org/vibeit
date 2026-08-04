/**
 * Dev-friendly email sender.
 * Logs messages in development; swap for Resend/SES/etc. in production.
 */
export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (process.env.NODE_ENV === "production" && !process.env.EMAIL_PROVIDER) {
    console.warn(
      "[email] No EMAIL_PROVIDER configured — message not delivered:",
      input.subject,
      "→",
      input.to,
    );
  }

  // Always log in non-production so reset/verify links are usable locally.
  if (process.env.NODE_ENV !== "production") {
    console.info("[email:dev]", {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  }

  // Hook for a real provider later, e.g. Resend:
  // if (process.env.RESEND_API_KEY) { await resend.emails.send(...) }
}