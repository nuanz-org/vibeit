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
  versionId?: string | null;
};

/**
 * View-only source (M2a5 / M3g / M5e). Product rule: no download endpoint or button.
 */
export function ViewSourcePanel({
  toolId,
  target,
  open,
  onToggle,
  sourceCode,
  isGenerated,
  versionId,
}: ViewSourcePanelProps) {
  const hasCode = Boolean(sourceCode?.trim());
  const stub = `// View-only · source is not downloadable (product rule)
// toolId: ${toolId}
// target: ${target}
${versionId ? `// versionId: ${versionId}\n` : ""}//
// ${
    isGenerated
      ? hasCode
        ? "Generated tool version (from API)."
        : "No version code stored yet for this tool."
      : "Fixture: apps/web/runtime/fixtures/social-frame/tool.ts"
  }
// Runtime preview uses the sandboxed canvas2d host.`;

  return (
    <div className={styles.sourcePanel}>
      <div className={styles.sourceHeader}>
        <button
          type="button"
          className={styles.sourceToggle}
          onClick={onToggle}
          aria-expanded={open}
        >
          {open ? "Hide source" : "View source"}
        </button>
        <span className={styles.sourcePolicy}>View only · no download</span>
      </div>
      {open ? (
        <>
          <p className={styles.sourceHint}>
            Source is visible in Studio for the owner only. There is no download
            control and no public source API.
          </p>
          <pre
            className={styles.sourcePre}
            data-view-only="true"
            data-download="false"
            // Prevent accidental browser save-as of selected text as primary UX;
            // still readable. No download attribute / blob link.
          >
            {hasCode ? sourceCode : stub}
          </pre>
        </>
      ) : null}
    </div>
  );
}
