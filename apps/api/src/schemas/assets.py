"""Asset API shapes (M1e). Wire JSON is camelCase."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AssetKind = Literal["inspiration", "studio", "export", "thumb"]
# M8c: thumb upload for gallery frame grab
UploadAssetKind = Literal["inspiration", "studio", "thumb", "export"]


class CamelModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        serialize_by_alias=True,
        extra="ignore",
    )


class AssetResponse(CamelModel):
    """Metadata returned after upload or owner GET."""

    id: str
    kind: AssetKind
    url: str
    content_type: str = Field(alias="contentType")
    byte_size: int = Field(alias="byteSize")
    original_filename: str | None = Field(default=None, alias="originalFilename")
    storage_key: str | None = Field(default=None, alias="storageKey")
