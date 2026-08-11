"use client";

import { useState } from "react";

import { createJob, type CreateJobResponse } from "@/lib/api/jobs";

/**
 * M1a proof: call protected POST /api/v1/jobs with session cookie.
 * Full Create UX lands in M3.
 */
export function CreateJobStub() {
  const [visionText, setVisionText] = useState(
    "A kinetic 9:16 social frame with bold headline and logo slot",
  );
  const [result, setResult] = useState<CreateJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const data = await createJob({
        visionText: visionText.trim(),
        clientMetadata: { uiSource: "create-page-m1a" },
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-[0.9rem] font-medium">
        Vision (stub create job)
        <textarea
          value={visionText}
          onChange={(e) => setVisionText(e.target.value)}
          rows={3}
          required
          className="mt-1.5 block w-full resize-y rounded-lg border border-foreground/14 bg-transparent px-3 py-2.5 text-inherit [font:inherit]"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !visionText.trim()}
        className="cursor-pointer self-start rounded-lg border-none bg-foreground px-4 py-[0.55rem] font-semibold text-background disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Starting…" : "Start create job (stub)"}
      </button>
      {error ? (
        <p className="m-0 text-sm text-[#dc143c]">{error}</p>
      ) : null}
      {result ? (
        <pre className="m-0 overflow-auto rounded-lg bg-foreground/[0.06] p-3 text-[0.8rem]">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
