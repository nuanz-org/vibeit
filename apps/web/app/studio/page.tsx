import { redirect } from "next/navigation";

import { DEFAULT_STUDIO_FIXTURE_ID } from "@/features/studio/fixtures";
import { requireSession } from "@/lib/auth/session";

/**
 * Studio index → default fixture (M2a5).
 * M3 will redirect here with a real tool/version id.
 */
export default async function StudioIndexPage() {
  await requireSession("/studio");
  redirect(`/studio/${DEFAULT_STUDIO_FIXTURE_ID}`);
}
