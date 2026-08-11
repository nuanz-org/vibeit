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
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-[0.9rem] font-medium">
        Kind
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as AssetKind)}
          className="mt-1.5 block rounded-lg border border-foreground/14 bg-transparent px-2.5 py-[0.45rem] text-inherit [font:inherit]"
        >
          <option value="inspiration">inspiration</option>
          <option value="studio">studio</option>
        </select>
      </label>

      <label className="text-[0.9rem] font-medium">
        Image (PNG / JPEG / WebP, max 10&nbsp;MB)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1.5 block [font:inherit]"
        />
      </label>

      <button
        type="submit"
        disabled={pending || !file}
        className="cursor-pointer self-start rounded-lg border-none bg-foreground px-4 py-[0.55rem] font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload image"}
      </button>

      {error ? (
        <p className="m-0 text-sm text-[#dc143c]">{error}</p>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-2 rounded-lg bg-foreground/[0.06] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.url}
            alt={result.originalFilename || "Uploaded asset"}
            crossOrigin="anonymous"
            className="max-h-[200px] max-w-full rounded-md object-contain"
          />
          <pre className="m-0 overflow-auto text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </form>
  );
}
