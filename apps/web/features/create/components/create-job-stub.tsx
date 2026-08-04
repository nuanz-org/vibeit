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
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>
        Vision (stub create job)
        <textarea
          value={visionText}
          onChange={(e) => setVisionText(e.target.value)}
          rows={3}
          required
          style={{
            display: "block",
            width: "100%",
            marginTop: "0.35rem",
            padding: "0.65rem 0.75rem",
            borderRadius: 8,
            border:
              "1px solid color-mix(in srgb, var(--foreground) 14%, transparent)",
            background: "transparent",
            color: "inherit",
            font: "inherit",
            resize: "vertical",
          }}
        />
      </label>
      <button
        type="submit"
        disabled={pending || !visionText.trim()}
        style={{
          alignSelf: "flex-start",
          padding: "0.55rem 1rem",
          borderRadius: 8,
          border: "none",
          background: "var(--foreground)",
          color: "var(--background)",
          fontWeight: 600,
          cursor: pending ? "wait" : "pointer",
          opacity: pending || !visionText.trim() ? 0.6 : 1,
        }}
      >
        {pending ? "Starting…" : "Start create job (stub)"}
      </button>
      {error ? (
        <p style={{ color: "crimson", fontSize: "0.875rem", margin: 0 }}>
          {error}
        </p>
      ) : null}
      {result ? (
        <pre
          style={{
            margin: 0,
            padding: "0.75rem",
            borderRadius: 8,
            fontSize: "0.8rem",
            overflow: "auto",
            background:
              "color-mix(in srgb, var(--foreground) 6%, transparent)",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
