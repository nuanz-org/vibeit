"""
Fork a published tool into the caller's account as a private draft.

Assets are referenced, not duplicated: asset_slots / draft_assets / thumbnail
keep pointing at the source asset ids. GET /api/v1/assets/raw/{id} is
anonymous, so images keep rendering. If the original owner deletes an asset,
the fork loses it. Acceptable for v1.
"""

from __future__ import annotations

from adapters.auth.types import AuthUser
from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import ToolRow


class ForkSourceNotFoundError(Exception):
    """Source missing, unpublished, or has no runnable version (map to 404)."""


async def fork_published_tool(
    *,
    public_id: str,
    user: AuthUser,
    tools: ToolsRepository,
) -> ToolRow:
    """
    Clone a published tool (thin-share or gallery) into a new draft owned by user.

    Fresh public_id, status=draft, empty chat_history, lineage set.
    Source row is not mutated.
    """
    pid = (public_id or "").strip()
    if not pid:
        raise ForkSourceNotFoundError(public_id)

    source = await tools.get_published_tool_by_public_id(pid)
    if source is None:
        raise ForkSourceNotFoundError(pid)

    version = await tools.get_tool_version_for_public(
        source.id,
        published_version_id=source.published_version_id,
    )
    if version is None or not (version.code or "").strip():
        raise ForkSourceNotFoundError(pid)

    copy = await tools.create_draft_tool(
        owner_user_id=user.id,
        title=source.title,
        description=source.description,
    )

    await tools.create_tool_version(
        tool_id=copy.id,
        target=version.target,
        code=version.code,
        param_schema=version.param_schema,
        default_params=version.default_params,
        asset_slots=version.asset_slots,
        plan=version.plan,
    )

    draft_params = source.draft_params if isinstance(source.draft_params, dict) else {}
    draft_assets = source.draft_assets if isinstance(source.draft_assets, dict) else {}
    if draft_params or draft_assets:
        await tools.update_tool_draft_state(
            copy.id,
            draft_params=draft_params if draft_params else None,
            draft_assets=draft_assets if draft_assets else None,
        )

    updated = await tools.set_tool_fork_metadata(
        copy.id,
        forked_from_tool_id=source.id,
        tags=list(source.tags or []),
        thumbnail_asset_id=source.thumbnail_asset_id,
    )
    if updated is None:
        raise RuntimeError(f"fork metadata update missed newly created tool {copy.id}")
    return updated
