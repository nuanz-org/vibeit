/**
 * POST /api/runtime/compile — transpile tool TypeScript → browser ESM.
 * Auth required (JSON 401 — never redirect).
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  COMPILED_JS_MAX_CHARS,
  TOOL_SOURCE_MAX_CHARS,
  compileToolModule,
} from "@/runtime/compile/tool-module";

type CompileBody = {
  source?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const typed = body as CompileBody;
  if (typeof typed.source !== "string") {
    return NextResponse.json(
      { error: "Field source must be a string" },
      { status: 400 },
    );
  }

  if (typed.source.length > TOOL_SOURCE_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `source exceeds ${TOOL_SOURCE_MAX_CHARS} character limit`,
      },
      { status: 400 },
    );
  }

  const result = await compileToolModule(typed.source);
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
