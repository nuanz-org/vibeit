/**
 * Client helper: POST /api/runtime/compile (session cookies).
 */

export class RuntimeCompileError extends Error {
  readonly status: number;
  readonly details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = "RuntimeCompileError";
    this.status = status;
    this.details = details;
  }
}

type CompileSuccess = { js: string };
type CompileFailure = { error?: string; details?: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * Compile tool TypeScript source to browser ESM.
 * Requires an authenticated session (credentials: include).
 */
export async function compileToolSource(source: string): Promise<string> {
  const res = await fetch("/api/runtime/compile", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new RuntimeCompileError(
      `Compile failed (${res.status}): invalid response`,
      res.status,
    );
  }

  if (!res.ok) {
    const errBody = isRecord(data) ? (data as CompileFailure) : {};
    const message =
      typeof errBody.error === "string"
        ? errBody.error
        : `Compile failed (${res.status})`;
    const details = Array.isArray(errBody.details)
      ? errBody.details.filter((d): d is string => typeof d === "string")
      : undefined;
    throw new RuntimeCompileError(message, res.status, details);
  }

  if (!isRecord(data) || typeof (data as CompileSuccess).js !== "string") {
    throw new RuntimeCompileError(
      "Compile response missing js string",
      res.status,
    );
  }

  return (data as CompileSuccess).js;
}
