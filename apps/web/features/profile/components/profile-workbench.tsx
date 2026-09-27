"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";

import { ArrowRight } from "@/components/icons";
import { ThemeToggle } from "@/components/prefs";
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
    <main className="wrap pt-10 pb-20 md:pt-14">
      <header className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="t-label text-muted">Profile</p>
          <h1 id="your-tools-heading" className="t-h2 mt-5">
            Your tools
          </h1>
        </div>
        <div className="flex min-w-0 items-center gap-3 lg:col-span-5 lg:justify-end lg:pb-1">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-band text-[12.5px] font-medium tracking-[-0.01em] text-fg select-none"
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium tracking-[-0.01em] text-fg">
              {name || "Your account"}
            </p>
            <p className="t-mono mt-0.5 truncate text-[12px] text-muted">{email}</p>
          </div>
          <ProfileSignOut className="ml-auto shrink-0 lg:ml-3" />
        </div>
      </header>

      <section className="mt-12 md:mt-14" aria-labelledby="your-tools-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            role="radiogroup"
            aria-label="Filter tools"
            className="relative grid w-full grid-cols-3 rounded-full border border-border bg-workspace p-[3px] sm:w-[18rem]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-[3px] left-[3px] rounded-full border border-border bg-surface shadow-knob transition-transform duration-[240ms] ease-standard"
              style={{
                width: `calc((100% - 6px) / ${KINDS.length})`,
                transform: `translateX(${Math.max(0, KINDS.findIndex((k) => k.id === kind)) * 100}%)`,
              }}
            />
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
                    "relative z-10 flex h-8 cursor-pointer items-center justify-center rounded-full text-[12.5px] transition-colors duration-[180ms] ease-standard pointer-coarse:h-11",
                    selected ? "font-medium text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {loadingFirst ? (
            <p className="t-label flex items-center gap-2 text-muted">
              <span
                className="live-dot size-1.5 rounded-full bg-accent-text"
                aria-hidden="true"
              />
              Loading your tools
            </p>
          ) : countLabel ? (
            <p className="t-mono text-[12px] text-muted">{countLabel}</p>
          ) : null}
        </div>

        {loadingFirst ? (
          <div
            className="mt-8 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy
            aria-label="Loading your tools"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="min-w-0">
                <div className="aspect-[4/3] rounded-[10px] border border-border bg-band" />
                <div className="mt-3 h-3.5 w-2/3 rounded-full bg-band" />
                <div className="mt-2 h-3 w-1/3 rounded-full bg-band" />
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <StateBox
            eyebrow="Error"
            title="Couldn’t load your tools."
            body={
              q.error instanceof Error
                ? q.error.message
                : "Something went wrong while fetching your library."
            }
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void q.refetch()}
            >
              Retry
            </button>
          </StateBox>
        ) : null}

        {empty ? <EmptyState kind={kind} /> : null}

        {!loadingFirst && !error && items.length > 0 ? (
          <>
            <ul className="mt-8 grid animate-panel-in grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((card) => (
                <li key={card.id} className="min-w-0">
                  <ProfileToolCard card={card} />
                </li>
              ))}
            </ul>
            {q.hasNextPage ? (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  className="btn btn-outline"
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

      <section className="mt-20" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading" className="t-label text-muted">
          Preferences
        </h2>
        <ul className="mt-4 border-t border-border">
          <li className="flex flex-col gap-3 border-b border-border py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="text-[15.5px] tracking-[-0.01em] text-fg">Theme</p>
              <p className="mt-0.5 text-[13.5px] text-muted">
                Light, dark, or match your system.
              </p>
            </div>
            <ThemeToggle className="self-start sm:self-auto" />
          </li>
        </ul>
      </section>
    </main>
  );
}

/** Derived empty state (design-language §3.21): dashed box, label, one line, action. */
function StateBox({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-8 rounded-[12px] border border-dashed border-border-strong px-6 py-10 md:px-10 md:py-14">
      <p className="t-label text-muted">{eyebrow}</p>
      <h2 className="t-h3 mt-3">{title}</h2>
      <p className="mt-2 max-w-[34rem] text-[15px] leading-[1.55] text-muted">{body}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function EmptyState({ kind }: { kind: OwnerToolKind }) {
  if (kind === "remixed") {
    return (
      <StateBox
        eyebrow="Remixed"
        title="You haven’t remixed anything."
        body="Open a published tool in the gallery and make your own copy."
      >
        <Link href="/gallery" className="btn btn-outline">
          Browse the gallery
        </Link>
      </StateBox>
    );
  }

  if (kind === "created") {
    return (
      <StateBox
        eyebrow="Created"
        title="No originals yet."
        body="Start from a vision and Aiditr will generate a tool you can keep editing."
      >
        <Link href="/create" className="btn btn-primary">
          Create a tool
          <ArrowRight className="btn-arrow" />
        </Link>
      </StateBox>
    );
  }

  return (
    <StateBox
      eyebrow="All tools"
      title="Nothing here yet."
      body="Create a tool from a vision, or remix one from the gallery."
    >
      <Link href="/create" className="btn btn-primary">
        Create a tool
        <ArrowRight className="btn-arrow" />
      </Link>
      <Link href="/gallery" className="btn btn-outline">
        Remix from the gallery
      </Link>
    </StateBox>
  );
}
