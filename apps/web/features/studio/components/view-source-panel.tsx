"use client";

import styles from "../styles.module.css";

export type ViewSourcePanelProps = {
  toolId: string;
  target: string;
  open: boolean;
  onToggle: () => void;
};

/**
 * View-only source stub (M2a5). Full source browser is M5; no download.
 */
export function ViewSourcePanel({
  toolId,
  target,
  open,
  onToggle,
}: ViewSourcePanelProps) {
  return (
    <div className={styles.sourcePanel}>
      <button type="button" className={styles.sourceToggle} onClick={onToggle}>
        {open ? "Hide source" : "View source"}
      </button>
      {open ? (
        <pre className={styles.sourcePre}>
          {`// View-only · fixture source is not downloadable (product rule)
// toolId: ${toolId}
// target: ${target}
//
// Runtime loads createSocialFrameTool inside a sandboxed iframe.
// Creative fill: apps/web/runtime/fixtures/social-frame/tool.ts
// Schema: @repo/contracts/examples/canvas2d-social-frame
//
// Full source browser lands in M5.`}
        </pre>
      ) : null}
    </div>
  );
}
