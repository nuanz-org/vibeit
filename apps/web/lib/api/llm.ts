import { getApiBaseUrl } from "./config";

export type LlmModelOption = {
  id: string;
  label: string;
  default?: boolean;
};

export type LlmModelsResponse = {
  models: LlmModelOption[];
  defaultModel: string;
};

/**
 * GET /api/v1/llm/models — selectable Create models from server config.
 */
export async function fetchLlmModels(): Promise<LlmModelsResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/llm/models`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Fetch LLM models failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }
  return res.json() as Promise<LlmModelsResponse>;
}
