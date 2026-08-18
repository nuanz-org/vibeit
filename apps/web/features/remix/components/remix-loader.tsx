"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { GalleryShell } from "@/features/gallery/components/gallery-shell";
import { ForkToolError, forkTool } from "@/lib/api/tools";
import { cn } from "@/lib/utils";

const btn = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card px-4",
  "text-sm font-medium text-ink-secondary no-underline",
  "transition-[border-color,background-color,color,opacity] duration-ui ease-ui",
  "hover:enabled:bg-surface hover:enabled:text-ink",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
);

export function RemixLoader({ publicId }: { publicId: string }) {
  const router = useRouter();
  const started = useRef(false);

  const mutation = useMutation({
    mutationFn: () => forkTool(publicId),
    onSuccess: (tool) => {
      router.replace(`/studio/${tool.id}`);
    },
    onError: (err) => {
      if (err instanceof ForkToolError && err.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(`/remix/${publicId}`)}`,
        );
      }
    },
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutation.mutate();
    // Fire once per mount; Retry calls mutate() directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId]);

  const err = mutation.error;
  const is404 = err instanceof ForkToolError && err.status === 404;
  const is401 = err instanceof ForkToolError && err.status === 401;

  if (is401 || mutation.isSuccess) {
    return (
      <GalleryShell>
        <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-16 pb-20 text-center">
          <p className="m-0 text-sm leading-snug text-muted-foreground">
            {is401 ? "Redirecting to sign in…" : "Opening Studio…"}
          </p>
        </main>
      </GalleryShell>
    );
  }

  if (mutation.isError && is404) {
    return (
      <GalleryShell>
        <main className="mx-auto mt-14 mb-8 flex max-w-md flex-col items-center gap-3 px-2 text-center">
          <h1 className="m-0 text-xl font-semibold tracking-tight text-balance">
            This tool is no longer available
          </h1>
          <p className="m-0 max-w-[26rem] text-[0.95rem] leading-relaxed text-muted-foreground">
            It may have been unpublished or removed from the gallery.
          </p>
          <Link href="/gallery" className={cn(btn, "mt-6")}>
            Back to gallery
          </Link>
        </main>
      </GalleryShell>
    );
  }

  if (mutation.isError) {
    const msg =
      err instanceof Error ? err.message : "Could not prepare your copy.";
    return (
      <GalleryShell>
        <main className="mx-auto mt-14 mb-8 flex max-w-md flex-col items-center gap-3 px-2 text-center">
          <h1 className="m-0 text-xl font-semibold tracking-tight">
            Could not remix this tool
          </h1>
          <p className="m-0 max-w-[26rem] text-[0.95rem] leading-relaxed text-muted-foreground">
            {msg}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              className={btn}
              onClick={() => {
                mutation.reset();
                mutation.mutate();
              }}
            >
              Retry
            </button>
            <Link href="/gallery" className={btn}>
              Back to gallery
            </Link>
          </div>
        </main>
      </GalleryShell>
    );
  }

  return (
    <GalleryShell>
      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-16 pb-20 text-center">
        <p className="m-0 text-sm leading-snug text-muted-foreground">
          Preparing your copy…
        </p>
      </main>
    </GalleryShell>
  );
}
