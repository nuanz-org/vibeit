"use client";

import { ChevronDown, Code } from "@/components/icons";
import { cn } from "@/lib/utils";

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
    <div className="-mx-4 flex flex-col gap-3 border-t border-border px-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="group hit inline-flex min-h-6 cursor-pointer items-center gap-1.5 text-muted transition-colors duration-[180ms] ease-standard hover:text-fg"
          onClick={onToggle}
          aria-expanded={open}
        >
          <Code size={13} />
          <span className="t-label">
            {open ? "Hide source" : "View source"}
          </span>
          <ChevronDown
            size={12}
            className={cn(
              "transition-transform duration-[240ms] ease-standard",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
        <span className="t-mono rounded-[5px] border border-border px-1.5 py-0.5 text-[10.5px] text-muted">
          View only · no download
        </span>
      </div>
      {open ? (
        <div className="flex animate-control-section-in flex-col gap-2">
          <p className="text-[11.5px] leading-snug text-muted">
            Source is visible in Studio for the owner only. There is no download
            control and no public source API.
          </p>
          <pre
            className="t-mono max-h-[280px] overflow-auto rounded-[10px] border border-border bg-workspace p-3 text-[11px] leading-[1.5] whitespace-pre-wrap text-fg select-text"
            data-view-only="true"
            data-download="false"
            // Prevent accidental browser save-as of selected text as primary UX;
            // still readable. No download attribute / blob link.
          >
            {hasCode ? sourceCode : stub}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
