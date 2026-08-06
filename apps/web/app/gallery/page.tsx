import type { Metadata } from "next";

import { GalleryList } from "@/features/gallery/components/gallery-list";

export const metadata: Metadata = {
  title: "Gallery · Vibeit",
  description: "Browse published interactive design tools on Vibeit.",
};

/**
 * M8e — public gallery list (no auth).
 * Outside proxy matcher — anonymous browse OK.
 */
export default function GalleryPage() {
  return <GalleryList />;
}
