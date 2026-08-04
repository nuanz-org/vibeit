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
