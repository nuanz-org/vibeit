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
  /** M8a gallery tags */
  tags?: string[];
  publishedAt?: string | null;
  publishedVersionId?: string | null;
  /** M8b: eligible for gallery list after gates */
  galleryReady?: boolean;
  exportSmokeAt?: string | null;
  /** M8c gallery thumbnail */
  thumbnailAssetId?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  latestVersion?: ToolVersionResponse | null;
  /** M5c: owner Studio param overlay */
  draftParams?: Record<string, unknown>;
  /** M5c: slotId → http URL | null */
  draftAssets?: Record<string, string | null>;
};

/** Structured gate failure from gallery publish 422. */
export type PublishGateFailure = {
  code: string;
  message: string;
};

/** M8a/M8b optional body for POST /publish (thin share = {}). */
export type ToolPublishRequest = {
  title?: string | null;
  description?: string | null;
  tags?: string[];
  /** When true, snap draftParams into a new version's defaultParams. */
  freezeDraft?: boolean;
  /** When true, run quality gates and set galleryReady. */
  forGallery?: boolean;
  /** Client proved captureFrame / PNG export (required when forGallery). */
  exportSmokeOk?: boolean;
  /** M8c: asset id from upload kind=thumb (required for gallery). */
  thumbnailAssetId?: string | null;
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
  tags?: string[];
  publishedAt?: string | null;
  publishedVersionId?: string | null;
  thumbnailAssetId?: string | null;
  /** CORS-safe raw URL for gallery cards / <img> */
  thumbnailUrl?: string | null;
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

export class PublishGatesError extends Error {
  readonly status: number;
  readonly code: string;
  readonly gates: PublishGateFailure[];

  constructor(
    message: string,
    opts: { status: number; code: string; gates: PublishGateFailure[] },
  ) {
    super(message);
    this.name = "PublishGatesError";
    this.status = opts.status;
    this.code = opts.code;
    this.gates = opts.gates;
  }
}

/**
 * POST /api/v1/tools/{toolId}/publish — owner publish (M7 thin + M8a/M8b).
 * Sets status=published, freezes publishedVersionId.
 * forGallery + exportSmokeOk → galleryReady after gates; else thin share only.
 */
export async function publishTool(
  toolId: string,
  body?: ToolPublishRequest,
): Promise<ToolResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/tools/${encodeURIComponent(toolId)}/publish`,
    {
      method: "POST",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 422 && text) {
      try {
        const parsed = JSON.parse(text) as {
          detail?: {
            code?: string;
            message?: string;
            gates?: PublishGateFailure[];
          };
        };
        const detail = parsed.detail;
        if (
          detail &&
          detail.code === "GATES_FAILED" &&
          Array.isArray(detail.gates)
        ) {
          throw new PublishGatesError(
            detail.message || "Publish gates failed",
            {
              status: res.status,
              code: detail.code,
              gates: detail.gates,
            },
          );
        }
      } catch (e) {
        if (e instanceof PublishGatesError) throw e;
      }
    }
    throw new Error(
      `Publish tool failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  return res.json() as Promise<ToolResponse>;
}

/**
 * POST /api/v1/tools/{toolId}/unpublish — owner full takedown (M8f).
 * status=draft, galleryReady=false; public /t and gallery hide the tool.
 */
export async function unpublishTool(toolId: string): Promise<ToolResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/tools/${encodeURIComponent(toolId)}/unpublish`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Unpublish tool failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  return res.json() as Promise<ToolResponse>;
}
