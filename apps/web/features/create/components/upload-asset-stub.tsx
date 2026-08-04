"use client";

import { useState } from "react";

import {
  uploadAsset,
  type AssetKind,
  type AssetResponse,
} from "@/lib/api/assets";

/**
 * M1e proof: authenticated image upload → storage + assets row + preview URL.
 */
export function UploadAssetStub() {
  const [kind, setKind] = useState<AssetKind>("inspiration");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AssetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const data = await uploadAsset(file, kind);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>
        Kind
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as AssetKind)}
          style={{
            display: "block",
            marginTop: "0.35rem",
            padding: "0.45rem 0.6rem",
            borderRadius: 8,
            border:
              "1px solid color-mix(in srgb, var(--foreground) 14%, transparent)",
            background: "transparent",
            color: "inherit",
            font: "inherit",
          }}
        >
          <option value="inspiration">inspiration</option>
          <option value="studio">studio</option>
        </select>
      </label>

      <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>
        Image (PNG / JPEG / WebP, max 10&nbsp;MB)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ display: "block", marginTop: "0.35rem", font: "inherit" }}
        />
      </label>

      <button
        type="submit"
        disabled={pending || !file}
        style={{
          alignSelf: "flex-start",
          padding: "0.55rem 1rem",
          borderRadius: 8,
          border: "none",
          background: "var(--foreground)",
          color: "var(--background)",
          fontWeight: 600,
          cursor: pending || !file ? "not-allowed" : "pointer",
          opacity: pending || !file ? 0.6 : 1,
        }}
      >
        {pending ? "Uploading…" : "Upload image"}
      </button>

      {error ? (
        <p style={{ color: "crimson", fontSize: "0.875rem", margin: 0 }}>
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0.75rem",
            borderRadius: 8,
            background:
              "color-mix(in srgb, var(--foreground) 6%, transparent)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.url}
            alt={result.originalFilename || "Uploaded asset"}
            crossOrigin="anonymous"
            style={{
              maxWidth: "100%",
              maxHeight: 200,
              objectFit: "contain",
              borderRadius: 6,
            }}
          />
          <pre
            style={{
              margin: 0,
              fontSize: "0.75rem",
              overflow: "auto",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </form>
  );
}
