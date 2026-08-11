import Link from "next/link";

import { UserMenu } from "@/features/auth/components/user-menu";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-foreground/10 px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="font-bold tracking-tight">Aiditr</span>
          <Link
            href="/gallery"
            className="text-[0.9rem] font-medium opacity-75"
          >
            Gallery
          </Link>
        </div>
        <UserMenu />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
        <h1 className="max-w-[640px] text-[clamp(2rem,5vw,3rem)] leading-[1.15] tracking-tighter">
          Turn a vision into a living design tool
        </h1>
        <p className="max-w-[480px] text-[1.05rem] leading-relaxed opacity-70">
          Describe what you want to make. Aiditr generates a freeform interactive
          tool you can control, export, share, and publish.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <Link
            href="/create"
            className="rounded-[10px] bg-foreground px-[1.15rem] py-[0.7rem] text-[0.95rem] font-semibold text-background"
          >
            Start creating
          </Link>
          <Link
            href="/gallery"
            className="rounded-[10px] border border-foreground/18 px-[1.15rem] py-[0.7rem] text-[0.95rem] font-medium"
          >
            Browse gallery
          </Link>
          <Link
            href="/login"
            className="rounded-[10px] border border-foreground/18 px-[1.15rem] py-[0.7rem] text-[0.95rem] font-medium"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
