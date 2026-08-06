/**
 * POST /api/runtime/compile-public — compile a *published* tool by publicId.
 *
 * M7e: anonymous /t/:publicId cannot use session-gated /api/runtime/compile.
 * Server fetches GET /api/v1/public/tools/{publicId} (draft → 404) and compiles
 * that version.code only — no arbitrary client-supplied source.
 */

import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/api/config";
import {
  COMPILED_JS_MAX_CHARS,
  TOOL_SOURCE_MAX_CHARS,
  compileToolModule,
} from "@/runtime/compile/tool-module";

type Body = {
  publicId?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/** Loose publicId shape (t_… tokens from new_public_id). */
function isPlausiblePublicId(id: string): boolean {
  if (id.length < 4 || id.length > 80) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const typed = body as Body;
  if (typeof typed.publicId !== "string" || !typed.publicId.trim()) {
    return NextResponse.json(
      { error: "Field publicId must be a non-empty string" },
      { status: 400 },
    );
  }

  const publicId = typed.publicId.trim();
  if (!isPlausiblePublicId(publicId)) {
    return NextResponse.json({ error: "Invalid publicId" }, { status: 400 });
  }

  const apiBase = getApiBaseUrl();
  let toolRes: Response;
  try {
    toolRes = await fetch(
      `${apiBase}/api/v1/public/tools/${encodeURIComponent(publicId)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        // Server-to-server; no cookies
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not reach public tools API" },
      { status: 502 },
    );
  }

  if (toolRes.status === 404) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }
  if (!toolRes.ok) {
    return NextResponse.json(
      { error: `Public tools API error (${toolRes.status})` },
      { status: 502 },
    );
  }

  let tool: unknown;
  try {
    tool = await toolRes.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid public tool payload" },
      { status: 502 },
    );
  }

  if (!isRecord(tool) || !isRecord(tool.version)) {
    return NextResponse.json(
      { error: "Invalid public tool payload" },
      { status: 502 },
    );
  }

  const source = tool.version.code;
  if (typeof source !== "string" || !source.trim()) {
    return NextResponse.json(
      { error: "Tool has no runnable source" },
      { status: 404 },
    );
  }

  if (source.length > TOOL_SOURCE_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `source exceeds ${TOOL_SOURCE_MAX_CHARS} character limit`,
      },
      { status: 400 },
    );
  }

  const result = await compileToolModule(source);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        details: result.details,
      },
      { status: 400 },
    );
  }

  if (result.js.length > COMPILED_JS_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `compiled JS exceeds ${COMPILED_JS_MAX_CHARS} character limit`,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ js: result.js });
}
