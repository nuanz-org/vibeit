"use client";

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
// Runtime preview uses the sandboxed iframe host (target: ${target}).`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="cursor-pointer self-start border-none bg-transparent font-inherit text-[0.8rem] font-medium underline opacity-70"
          onClick={onToggle}
          aria-expanded={open}
        >
          {open ? "Hide source" : "View source"}
        </button>
        <span className="text-[0.7rem] font-semibold tracking-[0.03em] uppercase opacity-50">
          View only · no download
        </span>
      </div>
      {open ? (
        <>
          <p className="m-0 text-[0.75rem] leading-snug opacity-55">
            Source is visible in Studio for the owner only. There is no download
            control and no public source API.
          </p>
          <pre
            className="m-0 max-h-[280px] overflow-auto rounded-[10px] bg-foreground/[0.06] p-3 text-[0.7rem] leading-snug whitespace-pre-wrap text-inherit select-text"
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
