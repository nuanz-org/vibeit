import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. Same-origin `/api/auth/*` — no baseURL needed in app.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession, requestPasswordReset, resetPassword } =
  authClient;