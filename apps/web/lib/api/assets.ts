import { getApiBaseUrl } from "./config";

export type AssetKind = "inspiration" | "studio";

export type AssetResponse = {
  id: string;
  kind: AssetKind | string;
  url: string;
  contentType: string;
  byteSize: number;
  originalFilename?: string | null;
  storageKey?: string | null;
};

/**
 * POST /api/v1/assets multipart upload with session cookie.
 */
export async function uploadAsset(
  file: File,
  kind: AssetKind = "inspiration",
): Promise<AssetResponse> {
  const body = new FormData();
  body.append("kind", kind);
  body.append("file", file);

  const res = await fetch(`${getApiBaseUrl()}/api/v1/assets`, {
    method: "POST",
    credentials: "include",
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Upload failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  return res.json() as Promise<AssetResponse>;
}
