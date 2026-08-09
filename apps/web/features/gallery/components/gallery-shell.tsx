"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { UserMenu } from "@/features/auth/components/user-menu";

import styles from "../styles.module.css";

export type GalleryShellProps = {
  children: ReactNode;
};

/**
 * Public gallery chrome (no auth required).
 */
export function GalleryShell({ children }: GalleryShellProps) {
  const pathname = usePathname() || "";
  const onBrowse =
    pathname === "/gallery" || pathname.startsWith("/gallery/");

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <Link href="/" className={styles.brand}>
            Vibeit
          </Link>
          <nav className={styles.nav} aria-label="Primary">
            <Link
              href="/gallery"
              className={`${styles.navLink} ${onBrowse ? styles.navLinkActive : ""}`}
              aria-current={onBrowse ? "page" : undefined}
            >
              Gallery
            </Link>
            <Link href="/create" className={styles.navLink}>
              Create
            </Link>
          </nav>
        </div>
        <UserMenu />
      </header>
      {children}
    </div>
  );
}
