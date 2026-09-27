import Link from "next/link";

import { Wordmark } from "@/components/wordmark";

/** Centred auth column on the page background, wordmark above the card. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-5 py-12 text-fg">
      <Link
        href="/gallery"
        className="wm-link mb-8 rounded-[8px] p-1"
        aria-label="Aiditr gallery"
      >
        <Wordmark />
      </Link>
      <div className="w-full max-w-[400px]">{children}</div>
    </main>
  );
}
