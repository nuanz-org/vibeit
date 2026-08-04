"""Extract TypeScript tool source from LLM codegen output (M3d)."""

from __future__ import annotations

import re


class CodegenParseError(ValueError):
    pass


def extract_typescript_module(text: str) -> str:
    """
    Strip markdown fences and return module source.
    """
    raw = (text or "").strip()
    if not raw:
        raise CodegenParseError("empty codegen response")

    fence = re.search(
        r"```(?:typescript|ts|tsx|javascript|js)?\s*([\s\S]*?)```",
        raw,
        re.IGNORECASE,
    )
    if fence:
        raw = fence.group(1).strip()

    if not raw:
        raise CodegenParseError("empty codegen after fence strip")

    # If the model still prefixed prose, try from first import/export
    if "import " not in raw and "export " not in raw:
        raise CodegenParseError("codegen missing import/export — not a module")

    # Drop leading prose before first import/export line
    lines = raw.splitlines()
    start = 0
    for i, line in enumerate(lines):
        s = line.strip()
        if s.startswith("import ") or s.startswith("export "):
            start = i
            break
    raw = "\n".join(lines[start:]).strip()
    return raw
