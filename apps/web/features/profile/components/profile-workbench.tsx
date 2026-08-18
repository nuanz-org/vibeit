"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { ProfileSignOut } from "@/features/auth/components/profile-sign-out";
import { useMyTools } from "@/features/profile/hooks/use-my-tools";
import type { OwnerToolKind } from "@/lib/api/tools";
import { cn } from "@/lib/utils";

import { ProfileToolCard } from "./profile-tool-card";

const KINDS: { id: OwnerToolKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "created", label: "Created" },
  { id: "remixed", label: "Remixed" },
];

const btn = cn(
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card px-4",
  "text-sm font-medium text-ink-secondary no-underline",
  "transition-[border-color,background-color,color,opacity] duration-ui ease-ui",
  "hover:bg-surface hover:text-ink",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-card disabled:hover:text-ink-secondary",
  "motion-reduce:transition-none",
);

const btnSolid = cn(
  "border-transparent bg-cta text-cta-foreground",
  "hover:border-transparent hover:bg-cta-hover hover:text-cta-foreground",
  "disabled:hover:bg-cta disabled:hover:text-cta-foreground",
);

function parseKind(raw: string | null): OwnerToolKind {
  if (raw === "created" || raw === "remixed") return raw;
  return "all";
}

function initialsFromUser(name?: string | null, email?: string | null): string {
  const source = (name?.trim() || email?.trim() || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (source.includes("@")) return source.slice(0, 2).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export type ProfileWorkbenchProps = {
  name: string | null;
  email: string;
};

export function ProfileWorkbench({ name, email }: ProfileWorkbenchProps) {
  const router = useRouter();
  const pathname = usePathname() || "/profile";
  const searchParams = useSearchParams();
  const kind = parseKind(searchParams.get("kind"));
  const q = useMyTools(kind);

  const items = useMemo(
    () => q.data?.pages.flatMap((p) => p.items) ?? [],
    [q.data?.pages],
  );

  const loadingFirst = q.isLoading;
  const error = q.isError && items.length === 0;
  const empty = !loadingFirst && !error && items.length === 0;
  const countLabel =
    items.length > 0
      ? q.hasNextPage
        ? `${items.length}+ tools`
        : `${items.length} ${items.length === 1 ? "tool" : "tools"}`
      : null;

  function setKind(next: OwnerToolKind) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("kind");
    else params.set("kind", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const initials = initialsFromUser(name, email);

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 py-10 md:px-6 md:py-12">
      <header className="flex items-center gap-4">
        <div
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-ink/8 text-[1rem] font-semibold tracking-[-0.02em] text-ink outline outline-1 outline-black/10 dark:outline-white/10"
          aria-hidden
        >
          <span className="translate-y-[0.5px]">{initials}</span>
        </div>
        <div className="min-w-0">
          <h1 className="m-0 text-balance text-[1.35rem] font-semibold tracking-[-0.025em] text-ink">
            {name || "Your account"}
          </h1>
          <p className="m-0 mt-1 truncate text-[0.9rem] text-muted-ink">
            {email}
          </p>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="your-tools-heading">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h2
              id="your-tools-heading"
              className="m-0 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
            >
              Your tools
            </h2>
            <div
              role="radiogroup"
              aria-label="Filter tools"
              className="mt-3 flex flex-wrap items-center gap-1"
            >
              {KINDS.map((item) => {
                const selected = kind === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setKind(item.id)}
                    className={cn(
                      "inline-flex min-h-11 cursor-pointer items-center rounded-[10px] px-3 text-[0.9rem] tracking-[-0.01em]",
                      "transition-[color,background-color] duration-ui ease-ui",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      "motion-reduce:transition-none",
                      selected
                        ? "bg-surface font-semibold text-ink"
                        : "font-medium text-ink-secondary hover:bg-surface hover:text-ink",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          {countLabel ? (
            <p className="m-0 text-[13px] text-muted-ink">{countLabel}</p>
          ) : null}
        </div>

        {loadingFirst ? (
          <div
            className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy
            aria-label="Loading your tools"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="min-w-0">
                <div className="aspect-[4/3] animate-pulse rounded-2xl bg-ink/8" />
                <div className="mt-3 h-3.5 w-2/3 animate-pulse rounded bg-ink/8" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-ink/6" />
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="mt-10 max-w-md">
            <p className="m-0 text-[0.95rem] leading-relaxed text-ink">
              Couldn’t load your tools.
            </p>
            <p className="m-0 mt-1 text-[0.9rem] leading-relaxed text-muted-ink">
              {q.error instanceof Error
                ? q.error.message
                : "Something went wrong while fetching your library."}
            </p>
            <button
              type="button"
              className={cn(btn, btnSolid, "mt-5")}
              onClick={() => void q.refetch()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {empty ? <EmptyState kind={kind} /> : null}

        {!loadingFirst && !error && items.length > 0 ? (
          <>
            <ul
              className={cn(
                "mt-6 m-0 grid list-none grid-cols-1 gap-x-5 gap-y-8 p-0",
                "sm:grid-cols-2 lg:grid-cols-3",
                "motion-safe:animate-[profile-grid-in_220ms_var(--ease-ui)]",
              )}
            >
              {items.map((card) => (
                <li key={card.id} className="min-w-0">
                  <ProfileToolCard card={card} />
                </li>
              ))}
            </ul>
            {q.hasNextPage ? (
              <div className="mt-8">
                <button
                  type="button"
                  className={btn}
                  disabled={q.isFetchingNextPage}
                  onClick={() => void q.fetchNextPage()}
                >
                  {q.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <div className="mt-16 border-t border-border-subtle pt-6">
        <ProfileSignOut className="w-full sm:w-auto" />
      </div>
    </main>
  );
}

function EmptyState({ kind }: { kind: OwnerToolKind }) {
  if (kind === "remixed") {
    return (
      <div className="mt-10 max-w-md">
        <p className="m-0 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
          You haven’t remixed anything.
        </p>
        <p className="m-0 mt-1.5 text-[0.95rem] leading-relaxed text-muted-ink">
          Open a published tool in the gallery and make your own copy.
        </p>
        <Link href="/gallery" className={cn(btn, btnSolid, "mt-5")}>
          Browse the gallery
        </Link>
      </div>
    );
  }

  if (kind === "created") {
    return (
      <div className="mt-10 max-w-md">
        <p className="m-0 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
          No originals yet.
        </p>
        <p className="m-0 mt-1.5 text-[0.95rem] leading-relaxed text-muted-ink">
          Start from a vision and Aiditr will generate a tool you can keep
          editing.
        </p>
        <Link href="/create" className={cn(btn, btnSolid, "mt-5")}>
          Create a tool
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 max-w-md">
      <p className="m-0 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
        Nothing here yet.
      </p>
      <p className="m-0 mt-1.5 text-[0.95rem] leading-relaxed text-muted-ink">
        Create a tool from a vision, or remix one from the gallery.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link href="/create" className={cn(btn, btnSolid)}>
          Create a tool
        </Link>
        <Link href="/gallery" className={btn}>
          Remix from the gallery
        </Link>
      </div>
    </div>
  );
}
