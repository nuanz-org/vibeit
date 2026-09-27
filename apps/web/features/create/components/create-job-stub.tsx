"use client";

import { useState } from "react";

import { Alert } from "@/components/icons";
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-medium leading-none tracking-[-0.005em] text-fg">
          Vision (stub create job)
        </span>
        <textarea
          value={visionText}
          onChange={(e) => setVisionText(e.target.value)}
          rows={3}
          required
          className="block w-full resize-y rounded-[8px] border border-border bg-bg px-3 py-2 text-[13.5px] leading-[1.35] text-fg transition-colors duration-fast ease-standard placeholder:text-muted hover:border-border-strong focus:border-fg focus:outline-none focus-visible:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !visionText.trim()}
        className="btn btn-ink btn-sm self-start"
      >
        {pending ? "Starting…" : "Start create job (stub)"}
      </button>
      {error ? (
        <p className="m-0 flex items-start gap-1.5 text-[12.5px] leading-[1.45] text-fg">
          <Alert size={14} className="mt-px shrink-0 text-danger" />
          {error}
        </p>
      ) : null}
      {result ? (
        <pre className="t-mono m-0 overflow-auto rounded-[8px] border border-border bg-band p-3 text-[11.5px] leading-[1.5] text-fg">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
