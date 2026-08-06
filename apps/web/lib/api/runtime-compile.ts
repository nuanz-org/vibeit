/**
 * Client helpers for tool TypeScript → browser ESM compile.
 * - Studio: POST /api/runtime/compile (session required)
 * - Public /t: POST /api/runtime/compile-public (by publicId only — M7e)
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

async function parseCompileResponse(
  res: Response,
  label: string,
): Promise<string> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new RuntimeCompileError(
      `${label}: invalid JSON response`,
      res.status,
    );
  }

  if (!res.ok) {
    const fail = isRecord(data) ? (data as CompileFailure) : {};
    const details = Array.isArray(fail.details)
      ? fail.details.filter((d): d is string => typeof d === "string")
      : undefined;
    throw new RuntimeCompileError(
      typeof fail.error === "string"
        ? fail.error
        : `${label} failed (${res.status})`,
      res.status,
      details,
    );
  }

  if (!isRecord(data) || typeof (data as CompileSuccess).js !== "string") {
    throw new RuntimeCompileError(`${label}: missing js field`, res.status);
  }
  return (data as CompileSuccess).js;
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

  return parseCompileResponse(res, "Compile");
}

/**
 * M7e — compile a published tool by publicId (no session).
 * Server loads public tool source; client cannot inject arbitrary TS.
 */
export async function compilePublicTool(publicId: string): Promise<string> {
  const res = await fetch("/api/runtime/compile-public", {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId }),
  });

  return parseCompileResponse(res, "Public compile");
}
