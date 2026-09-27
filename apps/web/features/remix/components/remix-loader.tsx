"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { ArrowLeft } from "@/components/icons";
import { GalleryShell } from "@/features/gallery/components/gallery-shell";
import { ForkToolError, forkTool } from "@/lib/api/tools";

/** Working status: live dot plus a mono label (no spinners). */
function RemixStatus({ label }: { label: string }) {
  return (
    <main className="wrap flex flex-1 items-center justify-center py-24">
      <p role="status" className="t-label flex items-center gap-2 text-muted">
        <span
          className="live-dot size-1.5 rounded-full bg-accent-text"
          aria-hidden="true"
        />
        {label}
      </p>
    </main>
  );
}

/** Derived empty state (design-language §3.21) for a full page. */
function RemixMessage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <main className="wrap flex-1 py-16 md:py-24">
      <p className="t-label text-muted">Remix</p>
      <h1 className="t-h2 mt-5">{title}</h1>
      <p className="mt-5 max-w-[34rem] text-[15px] leading-[1.55] text-muted">
        {body}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">{children}</div>
    </main>
  );
}

const backToGallery = (
  <Link href="/gallery" className="btn btn-outline">
    <ArrowLeft />
    Back to gallery
  </Link>
);

export function RemixLoader({ publicId }: { publicId: string }) {
  return (
    <GalleryShell>
      <RemixBody publicId={publicId} />
    </GalleryShell>
  );
}

function RemixBody({ publicId }: { publicId: string }) {
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
      <RemixStatus label={is401 ? "Redirecting to sign in" : "Opening Studio"} />
    );
  }

  if (mutation.isError && is404) {
    return (
      <RemixMessage
        title="This tool is no longer available."
        body="It may have been unpublished or removed from the gallery."
      >
        {backToGallery}
      </RemixMessage>
    );
  }

  if (mutation.isError) {
    const msg =
      err instanceof Error ? err.message : "Couldn’t prepare your copy.";
    return (
      <RemixMessage title="Couldn’t remix this tool." body={msg}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            mutation.reset();
            mutation.mutate();
          }}
        >
          Retry
        </button>
        {backToGallery}
      </RemixMessage>
    );
  }

  return <RemixStatus label="Preparing your copy" />;
}
