"""
Playwright host smoke (AM2b).

Mounts precompiled browser ESM in the real runtime-frame (sandboxed iframe),
checks console errors, non-blank canvas (pixel variance), captureFrame, and
saves a screenshot artifact.

Fail closed: missing Playwright/Chromium → clear error (never silent skip).
"""

from __future__ import annotations

import base64
import concurrent.futures
import http.server
import os
import socket
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from agent.validators.compile_check import apps_web_root

_ASSETS_DIR = Path(__file__).resolve().parent / "smoke_assets"
_HOST_HTML = _ASSETS_DIR / "host.html"

# Default blank-canvas threshold (luminance variance on 0–255 scale)
_DEFAULT_MIN_VARIANCE = 5.0
_DEFAULT_TIMEOUT_S = 45.0
_DEFAULT_SMOKE_DIR = Path(__file__).resolve().parents[3] / ".data" / "smoke"


@dataclass(frozen=True, slots=True)
class HostSmokeResult:
    ok: bool
    errors: list[str] = field(default_factory=list)
    mode: str = "host"
    variance: float | None = None
    screenshot_path: str | None = None
    capture_bytes: int | None = None


def smoke_artifact_dir() -> Path:
    env = os.getenv("VIBEIT_SMOKE_DIR", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    return _DEFAULT_SMOKE_DIR.resolve()


def _min_variance() -> float:
    raw = os.getenv("VIBEIT_SMOKE_MIN_VARIANCE", "").strip()
    if raw:
        try:
            return float(raw)
        except ValueError:
            pass
    return _DEFAULT_MIN_VARIANCE


def _pick_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


class _SmokeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Serve apps/web/public + /smoke-host.html from smoke_assets."""

    web_public: Path = Path()
    host_html_bytes: bytes = b""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(self.web_public), **kwargs)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        # Quiet — agent runs many smokes
        return

    def end_headers(self) -> None:
        # Sandboxed iframe (no allow-same-origin) has opaque origin "null".
        # type=module scripts require CORS; without ACAO the frame never boots.
        # Studio's Next static hosting faces the same rule; local smoke must set it.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path in ("/smoke-host.html", "/"):
            body = self.host_html_bytes
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()


def _start_static_server(web_public: Path, host_html: bytes) -> tuple[Any, str]:
    port = _pick_port()
    handler = type(
        "BoundSmokeHandler",
        (_SmokeHTTPRequestHandler,),
        {
            "web_public": web_public,
            "host_html_bytes": host_html,
        },
    )
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    return server, base


def _save_screenshot(
    *,
    png_bytes: bytes,
    job_id: str | None,
) -> str:
    out_dir = smoke_artifact_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%dT%H%M%S")
    safe_job = (job_id or "local").replace("/", "_")[:64]
    path = out_dir / f"{safe_job}_{stamp}_{os.getpid()}.png"
    path.write_bytes(png_bytes)
    return str(path)


def _run_host_smoke_impl(
    compiled_js: str,
    *,
    job_id: str | None,
    timeout: float,
    variance_floor: float,
) -> HostSmokeResult:
    """Inner implementation — must not run on a thread that already has an asyncio loop."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return HostSmokeResult(
            ok=False,
            errors=[
                "host_smoke: playwright not installed — "
                "run: cd apps/api && uv add playwright && uv run playwright install chromium"
            ],
        )

    web_root = apps_web_root()
    public = web_root / "public"
    frame_html = public / "runtime-frame.html"
    frame_js = public / "runtime-frame.js"
    if not frame_html.is_file() or not frame_js.is_file():
        return HostSmokeResult(
            ok=False,
            errors=[
                f"host_smoke: runtime-frame assets missing under {public} "
                "(run: pnpm --filter web build:runtime-frame)"
            ],
        )

    if not _HOST_HTML.is_file():
        return HostSmokeResult(
            ok=False,
            errors=[f"host_smoke: host.html missing at {_HOST_HTML}"],
        )

    host_html = _HOST_HTML.read_bytes()
    js = compiled_js
    server = None
    errors: list[str] = []
    variance: float | None = None
    screenshot_path: str | None = None
    capture_bytes: int | None = None

    try:
        server, base_url = _start_static_server(public, host_html)
        with sync_playwright() as p:
            try:
                browser = p.chromium.launch(headless=True)
            except Exception as exc:  # noqa: BLE001 — fail closed with message
                return HostSmokeResult(
                    ok=False,
                    errors=[
                        "host_smoke: failed to launch chromium — "
                        f"{exc}; run: uv run playwright install chromium"
                    ],
                )

            try:
                context = browser.new_context(
                    viewport={"width": 720, "height": 720},
                    device_scale_factor=1,
                )
                page = context.new_page()
                page_console: list[str] = []

                def _on_console(msg: Any) -> None:
                    if msg.type not in ("error", "warning"):
                        return
                    text = msg.text or ""
                    # Harmless: frame CSP uses <meta>; frame-ancestors only works on headers.
                    if "frame-ancestors" in text and "ignored" in text:
                        return
                    page_console.append(f"{msg.type}: {text}")

                page.on("console", _on_console)
                page.on(
                    "pageerror",
                    lambda err: page_console.append(f"pageerror: {err}"),
                )

                page.goto(
                    f"{base_url}/smoke-host.html",
                    wait_until="domcontentloaded",
                    timeout=int(timeout * 1000),
                )
                page.wait_for_function(
                    "() => window.__vibeitHostSmoke && typeof window.__vibeitHostSmoke.run === 'function'",
                    timeout=int(min(timeout, 15) * 1000),
                )

                result = page.evaluate(
                    """async ([moduleSource, minVariance, timeoutMs]) => {
                      return await window.__vibeitHostSmoke.run(moduleSource, {
                        minVariance,
                        readyTimeoutMs: Math.min(timeoutMs, 12000),
                        commandTimeoutMs: Math.min(timeoutMs, 15000),
                        settleMs: 450,
                      });
                    }""",
                    [js, variance_floor, int(timeout * 1000)],
                )

                if not isinstance(result, dict):
                    errors.append("host_smoke: unexpected evaluate result")
                else:
                    variance = float(result.get("variance") or 0.0)
                    capture_bytes = (
                        int(result["captureBytes"])
                        if result.get("captureBytes") is not None
                        else None
                    )
                    frame_errors = result.get("consoleErrors") or []
                    if isinstance(frame_errors, list):
                        for e in frame_errors:
                            if not e:
                                continue
                            if "frame-ancestors" in str(e) and "ignored" in str(e):
                                continue
                            errors.append(f"host_smoke: console: {e}")
                    for e in page_console:
                        if "pageerror" in e.lower() or e.lower().startswith("error:"):
                            errors.append(f"host_smoke: page: {e}")

                    if not result.get("ok"):
                        errors.append(
                            f"host_smoke: blank/near-blank canvas "
                            f"(variance={variance:.3f} < min={variance_floor})"
                        )

                    b64 = result.get("frameBase64")
                    if isinstance(b64, str) and b64:
                        try:
                            png = base64.b64decode(b64, validate=False)
                            screenshot_path = _save_screenshot(
                                png_bytes=png, job_id=job_id
                            )
                        except Exception as exc:  # noqa: BLE001
                            errors.append(
                                f"host_smoke: failed to save screenshot: {exc}"
                            )
                    else:
                        errors.append("host_smoke: no capture frame to save")

            except Exception as exc:  # noqa: BLE001
                errors.append(f"host_smoke: {exc}")
            finally:
                browser.close()
    except Exception as exc:  # noqa: BLE001
        errors.append(f"host_smoke: setup failed: {exc}")
    finally:
        if server is not None:
            try:
                server.shutdown()
            except Exception:  # noqa: BLE001
                pass

    seen: set[str] = set()
    uniq: list[str] = []
    for e in errors:
        if e not in seen:
            seen.add(e)
            uniq.append(e)

    return HostSmokeResult(
        ok=len(uniq) == 0,
        errors=uniq,
        mode="host",
        variance=variance,
        screenshot_path=screenshot_path,
        capture_bytes=capture_bytes,
    )


def run_host_smoke(
    compiled_js: str,
    *,
    job_id: str | None = None,
    timeout_seconds: float | None = None,
    min_variance: float | None = None,
) -> HostSmokeResult:
    """
    Mount compiled ESM in runtime-frame via Playwright + smoke host page.

    Preconditions: `compiled_js` is browser ESM from compile_check.

    Always runs Playwright on a worker thread so the Create runner's asyncio
    loop never collides with Playwright's sync API.
    """
    js = compiled_js or ""
    if not js.strip():
        return HostSmokeResult(ok=False, errors=["host_smoke: compiled js is empty"])

    timeout = (
        timeout_seconds
        if timeout_seconds is not None
        else float(os.getenv("VIBEIT_HOST_SMOKE_TIMEOUT_SECONDS", str(_DEFAULT_TIMEOUT_S)))
    )
    variance_floor = min_variance if min_variance is not None else _min_variance()

    # Thread isolate: runner + LangGraph invoke smoke from async contexts.
    pool_timeout = max(timeout + 30.0, 60.0)
    try:
        with concurrent.futures.ThreadPoolExecutor(
            max_workers=1, thread_name_prefix="host-smoke"
        ) as pool:
            fut = pool.submit(
                _run_host_smoke_impl,
                js,
                job_id=job_id,
                timeout=timeout,
                variance_floor=variance_floor,
            )
            return fut.result(timeout=pool_timeout)
    except concurrent.futures.TimeoutError:
        return HostSmokeResult(
            ok=False,
            errors=[f"host_smoke: overall timeout after {pool_timeout}s"],
        )
    except Exception as exc:  # noqa: BLE001
        return HostSmokeResult(
            ok=False,
            errors=[f"host_smoke: thread failed: {exc}"],
        )
