import type { Metadata } from "next";

import { GalleryList } from "@/features/gallery/components/gallery-list";

export const metadata: Metadata = {
  title: "Gallery · Aiditr",
  description: "Browse published interactive design tools on Aiditr.",
};

/**
 * M8e — public gallery list (no auth).
 * Outside proxy matcher — anonymous browse OK.
 */
export default function GalleryPage() {
  return <GalleryList />;
}
