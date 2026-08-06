import { getApiBaseUrl } from "./config";

export type ToolVersionResponse = {
  id: string;
  toolId: string;
  target: string;
  code: string;
  paramSchema: unknown;
  defaultParams: unknown;
  assetSlots: unknown;
  plan?: unknown;
  createdAt: string;
};

export type ToolResponse = {
  id: string;
  publicId: string;
  ownerUserId: string;
  status: string;
  title?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  latestVersion?: ToolVersionResponse | null;
  /** M5c: owner Studio param overlay */
  draftParams?: Record<string, unknown>;
  /** M5c: slotId → http URL | null */
  draftAssets?: Record<string, string | null>;
};

export type ToolDraftPatch = {
  draftParams?: Record<string, unknown>;
  draftAssets?: Record<string, string | null>;
};

/** M7d — anonymous public tool payload (no owner / draft fields). */
export type PublicToolVersionResponse = {
  id: string;
  target: string;
  code: string;
  paramSchema: unknown;
  defaultParams: unknown;
  assetSlots: unknown;
};

export type PublicToolResponse = {
  publicId: string;
  status: string;
  title?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  version: PublicToolVersionResponse;
};

/** GET /api/v1/tools/{toolId} — owner only. */
export async function getTool(toolId: string): Promise<ToolResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/tools/${encodeURIComponent(toolId)}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Get tool failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  return res.json() as Promise<ToolResponse>;
}

/**
 * PATCH /api/v1/tools/{toolId}/draft — owner only (M5c).
 * Full-replace for bags present; at least one bag required.
 */
export async function patchToolDraft(
  toolId: string,
  patch: ToolDraftPatch,
): Promise<ToolResponse> {
  if (patch.draftParams === undefined && patch.draftAssets === undefined) {
    throw new Error("patchToolDraft requires draftParams and/or draftAssets");
  }

  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/tools/${encodeURIComponent(toolId)}/draft`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftParams: patch.draftParams,
        draftAssets: patch.draftAssets,
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Patch tool draft failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  return res.json() as Promise<ToolResponse>;
}

/**
 * GET /api/v1/public/tools/{publicId} — no auth (M7d).
 * 404 when missing or still draft.
 */
export async function getPublicTool(
  publicId: string,
): Promise<PublicToolResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/public/tools/${encodeURIComponent(publicId)}`,
    {
      method: "GET",
      credentials: "omit",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Get public tool failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  return res.json() as Promise<PublicToolResponse>;
}

/**
 * POST /api/v1/tools/{toolId}/publish — owner thin make-public (M7d).
 * Sets status=published so the public GET works. No gallery (M8).
 */
export async function publishTool(toolId: string): Promise<ToolResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/tools/${encodeURIComponent(toolId)}/publish`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Publish tool failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  return res.json() as Promise<ToolResponse>;
}
