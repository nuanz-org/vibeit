"use client";

import styles from "../styles.module.css";

export type ViewSourcePanelProps = {
  toolId: string;
  target: string;
  open: boolean;
  onToggle: () => void;
  /** Generated or fixture source (view-only; no download). */
  sourceCode?: string | null;
  isGenerated?: boolean;
};

/**
 * View-only source (M2a5 / M3g). No download (product rule).
 */
export function ViewSourcePanel({
  toolId,
  target,
  open,
  onToggle,
  sourceCode,
  isGenerated,
}: ViewSourcePanelProps) {
  const stub = `// View-only · source is not downloadable (product rule)
// toolId: ${toolId}
// target: ${target}
//
// ${
    isGenerated
      ? "Generated tool version (from API)."
      : "Fixture: apps/web/runtime/fixtures/social-frame/tool.ts"
  }
// Runtime preview uses the sandboxed canvas2d host.`;

  return (
    <div className={styles.sourcePanel}>
      <button type="button" className={styles.sourceToggle} onClick={onToggle}>
        {open ? "Hide source" : "View source"}
      </button>
      {open ? (
        <pre className={styles.sourcePre}>
          {sourceCode?.trim() ? sourceCode : stub}
        </pre>
      ) : null}
    </div>
  );
}
