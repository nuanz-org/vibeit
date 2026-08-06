/**
 * M8c — capture frame blob → upload as assets kind=thumb.
 */

import { uploadAsset, type AssetResponse } from "@/lib/api/assets";

/**
 * Upload a PNG (or other image) blob as a gallery thumbnail for a tool.
 */
export async function uploadThumbnailBlob(
  blob: Blob,
  options: {
    toolId: string;
    filename?: string;
  },
): Promise<AssetResponse> {
  const type = blob.type || "image/png";
  const name = options.filename ?? `thumb-${Date.now()}.png`;
  const file = new File([blob], name, { type });
  return uploadAsset(file, "thumb", { toolId: options.toolId });
}
