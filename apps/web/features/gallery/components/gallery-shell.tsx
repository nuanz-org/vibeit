"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { UserMenu } from "@/features/auth/components/user-menu";

import styles from "../styles.module.css";

export type GalleryShellProps = {
  children: ReactNode;
  /** Optional badge next to brand (e.g. Gallery). */
  badge?: string;
};

/**
 * M8e — public gallery chrome (no auth required).
 */
export function GalleryShell({ children, badge = "Gallery" }: GalleryShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <Link href="/" className={styles.brand}>
            Vibeit
          </Link>
          <span className={styles.badge}>{badge}</span>
          <Link href="/gallery" className={styles.navLink}>
            Browse
          </Link>
          <Link href="/create" className={styles.navLink}>
            Create
          </Link>
        </div>
        <UserMenu />
      </header>
      {children}
    </div>
  );
}
