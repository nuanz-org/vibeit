import { getApiBaseUrl } from "./config";

/** M8d — public gallery card (no owner / draft / code). */
export type GalleryCard = {
  publicId: string;
  title?: string | null;
  description?: string | null;
  tags?: string[];
  thumbnailAssetId?: string | null;
  thumbnailUrl?: string | null;
  publishedAt?: string | null;
};

export type GalleryListResponse = {
  items: GalleryCard[];
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type ListGalleryOptions = {
  limit?: number;
  offset?: number;
};

/**
 * GET /api/v1/public/gallery — anonymous list of gallery-ready tools.
 */
export async function listGallery(
  options?: ListGalleryOptions,
): Promise<GalleryListResponse> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.offset != null) params.set("offset", String(options.offset));
  const qs = params.toString();
  const url = `${getApiBaseUrl()}/api/v1/public/gallery${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "omit",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `List gallery failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  return res.json() as Promise<GalleryListResponse>;
}

/**
 * GET /api/v1/public/gallery/{publicId} — one card (404 if not gallery-ready).
 */
export async function getGalleryItem(
  publicId: string,
): Promise<GalleryCard> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/public/gallery/${encodeURIComponent(publicId)}`,
    {
      method: "GET",
      credentials: "omit",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Get gallery item failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  return res.json() as Promise<GalleryCard>;
}
