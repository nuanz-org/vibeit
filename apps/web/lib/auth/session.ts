import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type Session } from "@/lib/auth";

/** Server-side session from request cookies. */
export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({
    headers: await headers(),
  });
}

/** Require a session or redirect to login (with optional return path). */
export async function requireSession(returnTo?: string): Promise<Session> {
  const session = await getSession();
  if (!session) {
    const params = returnTo
      ? `?next=${encodeURIComponent(returnTo)}`
      : "";
    redirect(`/login${params}`);
  }
  return session;
}