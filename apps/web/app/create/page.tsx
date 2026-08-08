import type { Metadata } from "next";

import { CreatePlayground } from "@/features/create/components/create-playground";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create · Vibeit",
};

/**
 * Create is auth-gated. Chat-first playground → job → Studio.
 */
export default async function CreatePage() {
  const session = await requireSession("/create");
  const name =
    (session.user as { name?: string | null }).name ?? null;

  return (
    <CreatePlayground
      userName={name}
      userEmail={session.user.email}
    />
  );
}
