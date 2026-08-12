"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const components: Components = {
  p: ({ children }) => (
    <p className="m-0 leading-[1.55] text-[0.9rem] text-inherit [&:not(:first-child)]:mt-2.5">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-ink/90">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline decoration-primary/30 underline-offset-[3px] transition-colors duration-ui ease-ui hover:decoration-primary"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="m-0 mt-2.5 list-disc space-y-1 pl-[1.15rem] text-[0.9rem] leading-[1.5] marker:text-muted-ink">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="m-0 mt-2.5 list-decimal space-y-1 pl-[1.15rem] text-[0.9rem] leading-[1.5] marker:font-medium marker:text-muted-ink">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-0.5 [&>p]:mt-0 [&>p]:inline">{children}</li>
  ),
  h1: ({ children }) => (
    <h1 className="m-0 mb-1.5 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink first:mt-0 [&:not(:first-child)]:mt-3.5">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="m-0 mb-1.5 text-[1rem] font-semibold tracking-[-0.02em] text-ink first:mt-0 [&:not(:first-child)]:mt-3">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="m-0 mb-1 text-[0.92rem] font-semibold tracking-[-0.015em] text-ink first:mt-0 [&:not(:first-child)]:mt-2.5">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="m-0 mb-1 text-[0.88rem] font-semibold tracking-[-0.01em] text-ink first:mt-0 [&:not(:first-child)]:mt-2">
      {children}
    </h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="m-0 mt-2.5 border-l-2 border-primary/35 py-0.5 pl-3 text-[0.88rem] leading-[1.5] text-muted-ink">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-3 border-0 border-t border-black/8 dark:border-white/10" />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (!isBlock) {
      return (
        <code
          className="rounded-[6px] bg-ink/[0.06] px-[0.35em] py-[0.12em] font-mono text-[0.82em] text-ink dark:bg-white/[0.08]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn("font-mono text-[0.8rem] leading-[1.55]", className)} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="m-0 mt-2.5 max-w-full overflow-x-auto rounded-[10px] bg-[#0a0a0c] px-3 py-2.5 text-[0.8rem] leading-[1.55] text-[#e8e8ed] ring-1 ring-black/10 shadow-sm shadow-black/15 dark:ring-white/8">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mt-2.5 max-w-full overflow-x-auto rounded-[10px] ring-1 ring-black/8 dark:ring-white/10">
      <table className="w-full min-w-[12rem] border-collapse text-left text-[0.82rem]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-ink/[0.04] text-ink dark:bg-white/[0.05]">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 font-semibold tracking-[-0.01em]">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-black/6 px-2.5 py-1.5 text-muted-ink dark:border-white/8">
      {children}
    </td>
  ),
  tr: ({ children }) => <tr className="align-top">{children}</tr>,
};

export type AiMarkdownProps = {
  children: string;
  className?: string;
};

/**
 * Renders AI message markdown (GFM) with product-matched typography.
 * No raw HTML — react-markdown default is safe for model output.
 */
export function AiMarkdown({ children, className }: AiMarkdownProps) {
  const text = children.trim();
  if (!text) return null;

  return (
    <div
      data-slot="ai-markdown"
      className={cn(
        "min-w-0 max-w-full text-[0.9rem] leading-[1.55] text-ink [overflow-wrap:anywhere]",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
