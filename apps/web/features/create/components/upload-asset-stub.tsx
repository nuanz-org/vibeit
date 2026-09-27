"use client";

import { useState } from "react";

import { Alert } from "@/components/icons";
import {
  uploadAsset,
  type AssetKind,
  type AssetResponse,
} from "@/lib/api/assets";

const labelCls =
  "text-[12.5px] font-medium leading-none tracking-[-0.005em] text-fg";

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
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Kind</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as AssetKind)}
          className="block h-9 w-fit cursor-pointer rounded-[8px] border border-border bg-bg px-3 text-[13.5px] leading-[1.35] text-fg transition-colors duration-fast ease-standard hover:border-border-strong focus:border-fg focus:outline-none focus-visible:outline-none pointer-coarse:h-11"
        >
          <option value="inspiration">inspiration</option>
          <option value="studio">studio</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>
          Image (PNG, JPEG or WebP, max{" "}
          <span className="t-mono">10&nbsp;MB</span>)
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block max-w-full text-[12.5px] text-muted file:mr-3 file:h-8 file:cursor-pointer file:rounded-full file:border file:border-border-strong file:bg-bg file:px-3 file:text-[12.5px] file:font-medium file:text-fg file:transition-colors file:duration-fast file:ease-standard hover:file:border-fg"
        />
      </label>

      <button
        type="submit"
        disabled={pending || !file}
        className="btn btn-ink btn-sm self-start"
      >
        {pending ? "Uploading…" : "Upload image"}
      </button>

      {error ? (
        <p className="m-0 flex items-start gap-1.5 text-[12.5px] leading-[1.45] text-fg">
          <Alert size={14} className="mt-px shrink-0 text-danger" />
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-band p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.url}
            alt={result.originalFilename || "Uploaded asset"}
            crossOrigin="anonymous"
            className="max-h-[200px] max-w-full rounded-[6px] object-contain"
          />
          <pre className="t-mono m-0 overflow-auto text-[11.5px] leading-[1.5] text-fg">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </form>
  );
}
