import { redirect } from "next/navigation";

/**
 * The marketing landing lives in its own project (aiditr-landing). The app
 * opens straight onto the gallery. Temporary redirect on purpose: if the
 * landing is ever served from this origin, `/` belongs to it.
 */
export default function Home() {
  redirect("/gallery");
}
