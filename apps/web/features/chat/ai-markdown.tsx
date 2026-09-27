"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/*
 * Product body copy is 13.5px / 1.55 (the landing's 12.5px chat is a mini
 * demo). Headings are 500 with slight negative tracking; code and tables
 * are mono on band with hairlines; links are accent text that draw an
 * underline on hover. No italics, no hex, no shadows.
 */
const components: Components = {
  p: ({ children }) => (
    <p className="m-0 text-[13.5px] leading-[1.55] text-inherit [&:not(:first-child)]:mt-2.5">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-medium text-inherit">{children}</strong>
  ),
  // No italics in UI: emphasis reads as weight instead.
  em: ({ children }) => (
    <em className="font-medium [font-style:normal]">{children}</em>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="link-draw text-accent-text"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="m-0 mt-2.5 list-disc space-y-1 pl-[18px] text-[13.5px] leading-[1.55] marker:text-muted">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="m-0 mt-2.5 list-decimal space-y-1 pl-[18px] text-[13.5px] leading-[1.55] marker:text-muted">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-0.5 [&>p]:mt-0 [&>p]:inline">{children}</li>
  ),
  h1: ({ children }) => (
    <h1 className="m-0 mb-1.5 text-[15px] leading-snug font-medium tracking-[-0.01em] text-inherit [&:not(:first-child)]:mt-3.5">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="m-0 mb-1.5 text-[14px] leading-snug font-medium tracking-[-0.01em] text-inherit [&:not(:first-child)]:mt-3">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="m-0 mb-1 text-[13.5px] leading-snug font-medium tracking-[-0.01em] text-inherit [&:not(:first-child)]:mt-2.5">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="m-0 mb-1 text-[13.5px] leading-snug font-medium tracking-[-0.005em] text-muted [&:not(:first-child)]:mt-2">
      {children}
    </h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="m-0 mt-2.5 border-l border-border-strong py-0.5 pl-3 text-[13.5px] leading-[1.55] text-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-0 border-t border-border" />,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (!isBlock) {
      return (
        <code
          className="t-mono rounded-[5px] border border-border bg-band px-1 py-px text-[12.5px] text-inherit"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className={cn("t-mono text-[12.5px] leading-[1.55]", className)}
        {...props}
      >
        {children}
      </code>
    );
  },
  // Unlabelled fences render through the inline branch; strip its chip here.
  pre: ({ children }) => (
    <pre className="t-mono m-0 mt-2.5 max-w-full overflow-x-auto rounded-[8px] border border-border bg-band px-3 py-2.5 text-[12.5px] leading-[1.55] text-fg [&_code]:rounded-none [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mt-2.5 max-w-full overflow-x-auto rounded-[8px] border border-border">
      <table className="w-full min-w-[12rem] border-collapse text-left text-[12.5px] leading-[1.45]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-band text-fg">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 font-medium tracking-[-0.005em]">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border px-2.5 py-1.5 text-muted">
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
        "min-w-0 max-w-full text-[13.5px] leading-[1.55] text-inherit [overflow-wrap:anywhere]",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
