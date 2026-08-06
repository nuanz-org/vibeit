"""
Public tool read + owner publish (M7d + M8a + M8b + M8c).

Access (access-rules.md):
- Draft tools are never returned on the public surface (404 hide).
- Published tools are readable anonymously by public_id.
- No source *download* route — code may appear in JSON for sandbox mount only.
- Owner draft personalization is not exposed publicly unless freeze_draft=true
  on publish (then snapped into a new version's default_params).

M8a publish:
- Optional title / description / tags on the tool row.
- Freeze published_version_id to the version public run will use.
- Failed gens never published: require a non-empty code version.

M8b gates:
- Thin share (for_gallery=False): runnable version only; gallery_ready unchanged/false.
- Gallery publish (for_gallery=True): domain.publish_gates must pass; sets gallery_ready.

M8c thumbnail:
- Optional thumbnail_asset_id on publish (kind=thumb preferred).
- Gallery requires a thumbnail (gate GALLERY_THUMBNAIL_REQUIRED).
- Public URL via /api/v1/assets/raw/{id} (anonymous CORS).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from adapters.db.repositories.assets import AssetsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import ToolRow, ToolVersionRow
from domain.publish_gates import GateFailure, PublishGateInput, evaluate_publish_gates
from schemas.tools import PublicToolResponse, PublicToolVersionResponse
from services.upload_asset import asset_public_url

# Asset kinds allowed as gallery thumbnails
_THUMB_KINDS = frozenset({"thumb", "export"})


class PublicToolError(Exception):
    def __init__(self, message: str, *, code: str = "NOT_FOUND") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class PublishGateError(Exception):
    """Gallery publish blocked by one or more quality gates."""

    def __init__(self, failures: list[GateFailure]) -> None:
        self.failures = list(failures)
        self.code = "GATES_FAILED"
        self.message = "Publish gates failed"
        super().__init__(self.message)

    def as_detail(self) -> dict[str, Any]:
        return {
            "message": self.message,
            "code": self.code,
            "gates": [f.as_dict() for f in self.failures],
        }


def _utc_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (
        dt.astimezone(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def normalize_tags(tags: list[str] | None) -> list[str] | None:
    """
    Normalize tag list for storage.
    Returns None when tags was not provided (leave existing).
    Empty list clears tags.
    """
    if tags is None:
        return None
    seen: set[str] = set()
    out: list[str] = []
    for raw in tags:
        t = " ".join(str(raw).strip().lower().split())
        if not t or t in seen:
            continue
        if len(t) > 48:
            t = t[:48]
        seen.add(t)
        out.append(t)
        if len(out) >= 20:
            break
    return out


def _merge_defaults(
    base: Any,
    draft: Any,
) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    if isinstance(base, dict):
        merged.update(base)
    if isinstance(draft, dict):
        merged.update(draft)
    return merged


def to_public_tool_response(
    tool: ToolRow,
    version: ToolVersionRow,
    *,
    api_public_base_url: str | None = None,
) -> PublicToolResponse:
    thumb_id = (
        str(tool.thumbnail_asset_id) if tool.thumbnail_asset_id is not None else None
    )
    thumb_url = None
    if thumb_id and api_public_base_url:
        thumb_url = asset_public_url(
            api_public_base_url=api_public_base_url,
            asset_id=thumb_id,
        )
    return PublicToolResponse(
        public_id=tool.public_id,
        status=tool.status,
        title=tool.title,
        description=tool.description,
        tags=list(tool.tags or []),
        published_at=_utc_iso(tool.published_at),
        published_version_id=str(version.id),
        thumbnail_asset_id=thumb_id,
        thumbnail_url=thumb_url,
        version=PublicToolVersionResponse(
            id=str(version.id),
            target=version.target,
            code=version.code,
            param_schema=version.param_schema,
            default_params=version.default_params,
            asset_slots=version.asset_slots,
        ),
    )


async def get_public_tool(
    *,
    tools: ToolsRepository,
    public_id: str,
    api_public_base_url: str | None = None,
) -> PublicToolResponse:
    """
    Load a published tool by public_id for anonymous /t/:publicId.
    Uses frozen published_version_id when set; else latest version.
    Raises PublicToolError if missing, draft, or no version.
    """
    pid = (public_id or "").strip()
    if not pid:
        raise PublicToolError("Tool not found")

    tool = await tools.get_published_tool_by_public_id(pid)
    if tool is None:
        # Hide draft existence: same 404 as unknown id
        raise PublicToolError("Tool not found")

    version = await tools.get_tool_version_for_public(
        tool.id,
        published_version_id=tool.published_version_id,
    )
    if version is None:
        raise PublicToolError("Tool not found")

    return to_public_tool_response(
        tool,
        version,
        api_public_base_url=api_public_base_url,
    )


def _effective_title(
    *,
    request_title: str | None,
    tool_title: str | None,
) -> str | None:
    """Title after publish: request wins when provided; else existing tool title."""
    if request_title is not None:
        cleaned = request_title.strip()
        return cleaned or None
    existing = (tool_title or "").strip()
    return existing or None


async def _resolve_thumbnail_id(
    *,
    tools_owner_user_id: str,
    assets: AssetsRepository | None,
    request_thumbnail_asset_id: str | None,
    existing_thumbnail_asset_id: UUID | None,
) -> tuple[str | None, bool]:
    """
    Resolve thumbnail for publish.

    Returns (asset_id_str | None, should_write_to_tool).
    When request_thumbnail_asset_id is provided, validate ownership + kind.
    Empty string clears. None keeps existing.
    """
    if request_thumbnail_asset_id is None:
        if existing_thumbnail_asset_id is None:
            return None, False
        return str(existing_thumbnail_asset_id), False

    cleaned = request_thumbnail_asset_id.strip()
    if not cleaned:
        return None, True  # clear

    if assets is None:
        raise PublicToolError(
            "Cannot attach thumbnail without assets repository",
            code="THUMB_INVALID",
        )

    row = await assets.get_asset_for_owner(
        cleaned,
        owner_user_id=tools_owner_user_id,
    )
    if row is None:
        raise PublicToolError(
            "Thumbnail asset not found or not owned by you",
            code="THUMB_NOT_FOUND",
        )
    if row.kind not in _THUMB_KINDS:
        raise PublicToolError(
            f"Thumbnail asset kind must be thumb or export, got {row.kind!r}",
            code="THUMB_INVALID_KIND",
        )
    return str(row.id), True


async def publish_tool_for_share(
    *,
    tools: ToolsRepository,
    tool_id: str,
    owner_user_id: str,
    title: str | None = None,
    description: str | None = None,
    tags: list[str] | None = None,
    freeze_draft: bool = False,
    for_gallery: bool = False,
    export_smoke_ok: bool = False,
    thumbnail_asset_id: str | None = None,
    assets: AssetsRepository | None = None,
) -> ToolRow:
    """
    Owner publish (M7d thin share + M8a metadata + M8b gates + M8c thumb).

    Requires a tool_version with non-empty code so public mount can run.
    Failed generations never create a ready version — so no version / empty
    code blocks publish.

    Version freeze policy:
    - Always set published_version_id to the version public will run.
    - Default (freeze_draft=False): pin latest version; draft_params stay
      private (public uses version default_params only) — M7 behavior.
    - freeze_draft=True: create a new version with default_params merged from
      version defaults + owner draft_params, then pin that version.

    M8b gallery vs share:
    - for_gallery=False (default): thin share — status=published only.
      gallery_ready is left false if first publish; not cleared on re-publish.
    - for_gallery=True: evaluate domain.publish_gates; on pass set
      gallery_ready=true and export_smoke_at; on fail raise PublishGateError.

    M8c: thumbnail_asset_id optional; required for gallery (gate).
    """
    tool = await tools.get_tool_by_id(tool_id)
    if tool is None or tool.owner_user_id != owner_user_id:
        raise LookupError("Tool not found")

    latest = await tools.get_latest_tool_version(tool.id)
    has_version = latest is not None
    code = (latest.code if latest else "") or ""
    target = (latest.target if latest else "") or ""
    param_schema = latest.param_schema if latest else None

    effective_title = _effective_title(request_title=title, tool_title=tool.title)

    resolved_thumb, write_thumb = await _resolve_thumbnail_id(
        tools_owner_user_id=owner_user_id,
        assets=assets,
        request_thumbnail_asset_id=thumbnail_asset_id,
        existing_thumbnail_asset_id=tool.thumbnail_asset_id,
    )
    has_thumbnail = resolved_thumb is not None

    # Thin path still needs runnable code (same invariant as M8a)
    if not has_version or not code.strip():
        if for_gallery:
            failures = evaluate_publish_gates(
                PublishGateInput(
                    has_version=has_version,
                    code=code,
                    target=target,
                    param_schema=param_schema,
                    title=effective_title,
                    for_gallery=True,
                    export_smoke_ok=export_smoke_ok,
                    has_thumbnail=has_thumbnail,
                )
            )
            raise PublishGateError(failures)
        raise PublicToolError(
            "Cannot publish a tool without a ready version",
            code="NO_VERSION",
        )

    assert latest is not None

    if for_gallery:
        failures = evaluate_publish_gates(
            PublishGateInput(
                has_version=True,
                code=code,
                target=target,
                param_schema=param_schema,
                title=effective_title,
                for_gallery=True,
                export_smoke_ok=export_smoke_ok,
                has_thumbnail=has_thumbnail,
            )
        )
        if failures:
            raise PublishGateError(failures)

    version_to_publish: ToolVersionRow = latest
    if freeze_draft:
        draft = tool.draft_params if isinstance(tool.draft_params, dict) else {}
        if draft:
            version_to_publish = await tools.create_tool_version(
                tool_id=tool.id,
                target=latest.target,
                code=latest.code,
                param_schema=latest.param_schema,
                default_params=_merge_defaults(latest.default_params, draft),
                asset_slots=latest.asset_slots,
                plan=latest.plan,
            )

    tags_arg = normalize_tags(tags)

    title_for_db: str | None = None
    if title is not None:
        title_for_db = title.strip()

    desc_for_db: str | None = None
    if description is not None:
        desc_for_db = description.strip()

    # Thumb proves capture → count as export smoke when attaching for gallery
    mark_smoke = bool(
        for_gallery and (export_smoke_ok or (write_thumb and has_thumbnail))
    )

    updated = await tools.set_tool_published(
        tool.id,
        owner_user_id=owner_user_id,
        published_version_id=version_to_publish.id,
        title=title_for_db,
        description=desc_for_db,
        tags=tags_arg,
        gallery_ready=True if for_gallery else None,
        mark_export_smoke=mark_smoke,
        thumbnail_asset_id=resolved_thumb if write_thumb else None,
        set_thumbnail=write_thumb,
    )
    if updated is None:
        raise LookupError("Tool not found")
    return updated


async def unpublish_tool(
    *,
    tools: ToolsRepository,
    tool_id: str,
    owner_user_id: str,
) -> ToolRow:
    """
    M8f full takedown for owner (and ops via same owner path).

    Sets status=draft + gallery_ready=false + clears published_at.
    Public /t/:publicId and gallery list 404-hide the tool.
    Thumbnail and frozen version id are kept for re-publish.
    """
    tool = await tools.get_tool_by_id(tool_id)
    if tool is None or tool.owner_user_id != owner_user_id:
        raise LookupError("Tool not found")

    updated = await tools.set_tool_unpublished(
        tool.id,
        owner_user_id=owner_user_id,
    )
    if updated is None:
        raise LookupError("Tool not found")
    return updated
