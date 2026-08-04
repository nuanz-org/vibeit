import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

import { sendEmail } from "@/lib/email";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Better Auth (Postgres connection string).",
  );
}

/**
 * Better Auth server instance.
 * Email/password is the MVP provider; sessions live in shared Postgres
 * so FastAPI can validate the same session tokens.
 */
export const auth = betterAuth({
  database: new Pool({
    connectionString: databaseUrl,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Do not require verification for local MVP; still send verify links when asked.
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Reset your Vibeit password",
        text: `Click the link to reset your password:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
      });
    },
    onPasswordReset: async ({ user }) => {
      console.info(`[auth] Password reset completed for ${user.email}`);
    },
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your Vibeit email",
        text: `Click the link to verify your email:\n\n${url}`,
      });
    },
  },
  // last plugin so Set-Cookie works from server actions
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;