"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import { AiMarkdown } from "@/features/chat/ai-markdown";
import { cn } from "@/lib/utils";

export type AiMessageRole = "user" | "assistant" | "system";

export type AiMessageProps = {
  role: AiMessageRole;
  children: ReactNode;
  /** Optional label above the bubble (e.g. "You", "Aiditr"). */
  header?: ReactNode;
  /** Optional footer under the bubble (status, actions). */
  footer?: ReactNode;
  className?: string;
  /** Override bubble variant. Defaults: user=default, assistant=soft, system=muted. */
  variant?:
    | "default"
    | "secondary"
    | "muted"
    | "outline"
    | "ghost"
    | "destructive"
    | "tinted";
  showAvatar?: boolean;
  /**
   * Render string children as markdown.
   * Default: on for assistant/system, off for user.
   * Forced off when children is not a plain string (e.g. ClarifyPanel).
   */
  markdown?: boolean;
  /**
   * Collapse plain-text user messages past this many visual lines.
   * Default 4 for user; set 0 to disable. Ignored for markdown / non-string.
   */
  collapseLines?: number;
  /** Show copy control for string messages. Default true when children is a string. */
  showCopy?: boolean;
};

function roleDefaults(role: AiMessageRole): {
  align: "start" | "end";
  variant: NonNullable<AiMessageProps["variant"]>;
  label: string;
  avatar: string;
  markdown: boolean;
} {
  switch (role) {
    case "user":
      return {
        align: "end",
        variant: "default",
        label: "You",
        avatar: "You",
        markdown: false,
      };
    case "system":
      return {
        align: "start",
        variant: "muted",
        label: "System",
        avatar: "·",
        markdown: true,
      };
    case "assistant":
    default:
      return {
        align: "start",
        /** Soft card — readable for long markdown without a harsh outline box. */
        variant: "secondary",
        label: "Aiditr",
        avatar: "Ai",
        markdown: true,
      };
  }
}

function AiditrMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid size-full place-items-center rounded-full",
        "bg-[linear-gradient(145deg,#0000ff_0%,#0735ff_55%,#1c1d1f_140%)]",
        "text-[0.58rem] font-bold tracking-[-0.04em] text-white",
        className,
      )}
      aria-hidden
    >
      Ai
    </span>
  );
}

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Plain-text body that clamps to `maxLines` visual lines with Show more / Show less.
 * Uses CSS line-clamp so wrapped long URLs count as multiple lines (like ChatGPT).
 */
function CollapsiblePlainText({
  text,
  maxLines,
  className,
  toggleClassName,
}: {
  text: string;
  maxLines: number;
  className?: string;
  toggleClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el || maxLines <= 0) {
      setCanCollapse(false);
      return;
    }
    // Always measure against the clamped box so we know if expand is needed.
    const prevClamp = el.style.webkitLineClamp;
    const prevDisplay = el.style.display;
    const prevOverflow = el.style.overflow;
    el.style.display = "-webkit-box";
    el.style.webkitBoxOrient = "vertical";
    el.style.webkitLineClamp = String(maxLines);
    el.style.overflow = "hidden";
    const overflows = el.scrollHeight > el.clientHeight + 1;
    el.style.webkitLineClamp = prevClamp;
    el.style.display = prevDisplay;
    el.style.overflow = prevOverflow;
    setCanCollapse(overflows);
  }, [maxLines, text]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const clamped = maxLines > 0 && !expanded && canCollapse;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span
        ref={textRef}
        className={cn(
          "min-w-0 [overflow-wrap:anywhere] whitespace-pre-wrap",
          className,
        )}
        style={
          clamped
            ? {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: maxLines,
                overflow: "hidden",
              }
            : undefined
        }
      >
        {text}
      </span>
      {canCollapse ? (
        <button
          type="button"
          className={cn(
            "self-start border-0 bg-transparent p-0 text-left text-[0.82rem] font-medium",
            "cursor-pointer opacity-70 transition-opacity duration-ui ease-ui",
            "hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            toggleClassName,
          )}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

function MessageCopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCopy = useCallback(async () => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1600);
  }, [text]);

  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg",
        "text-muted-ink transition-[background-color,color,transform] duration-ui ease-ui",
        "hover:bg-ink/6 hover:text-ink",
        "active:scale-[0.96]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "motion-reduce:transition-none motion-reduce:active:scale-100",
        className,
      )}
      onClick={() => void onCopy()}
      aria-label={copied ? "Copied" : "Copy message"}
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-primary" aria-hidden />
      ) : (
        <CopyIcon className="size-3.5" aria-hidden />
      )}
    </button>
  );
}

/**
 * Thin product wrapper over shadcn Message + Bubble for AI/chat rows.
 * Presentational only — no job/API logic.
 * Assistant strings render as markdown (GFM); user stays plain text.
 * Long user plain text collapses after 4 visual lines with Show more.
 */
export function AiMessage({
  role,
  children,
  header,
  footer,
  className,
  variant,
  showAvatar = true,
  markdown,
  collapseLines,
  showCopy,
}: AiMessageProps) {
  const defaults = roleDefaults(role);
  const align = defaults.align;
  const bubbleVariant = variant ?? defaults.variant;
  const isPlainString = typeof children === "string";
  const useMarkdown =
    isPlainString &&
    (markdown ?? defaults.markdown) &&
    children.trim().length > 0;

  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const isGhost = bubbleVariant === "ghost";

  const lineLimit =
    collapseLines !== undefined
      ? collapseLines
      : isUser && isPlainString && !useMarkdown
        ? 4
        : 0;

  const copyEnabled =
    showCopy !== undefined ? showCopy : isPlainString && children.trim().length > 0;

  let body: ReactNode;
  if (useMarkdown) {
    body = <AiMarkdown>{children as string}</AiMarkdown>;
  } else if (isPlainString && lineLimit > 0) {
    body = (
      <CollapsiblePlainText
        text={children}
        maxLines={lineLimit}
        toggleClassName={
          bubbleVariant === "default"
            ? "text-primary-foreground"
            : "text-muted-ink hover:text-ink"
        }
      />
    );
  } else if (isPlainString) {
    body = (
      <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">
        {children}
      </span>
    );
  } else {
    body = children;
  }

  const copyFooter =
    copyEnabled && isPlainString ? (
      <MessageCopyButton text={(children as string).trim()} />
    ) : null;

  const mergedFooter =
    footer || copyFooter ? (
      <div
        className={cn(
          "flex w-full min-w-0 items-center gap-1",
          footer && copyFooter ? "justify-between" : "justify-end",
          isUser && "justify-end",
          !isUser && footer && copyFooter && "justify-between",
          !isUser && !footer && copyFooter && "justify-start",
        )}
      >
        {footer ? <div className="min-w-0 flex-1">{footer}</div> : null}
        {copyFooter}
      </div>
    ) : null;

  return (
    <Message
      align={align}
      className={cn(
        "animate-[ai-msg-in_280ms_var(--ease-ui,cubic-bezier(0.2,0,0,1))_both]",
        "motion-reduce:animate-none",
        className,
      )}
    >
      {showAvatar ? (
        <MessageAvatar
          className={cn(
            "self-end translate-y-0!",
            isAssistant &&
              "rounded-full shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.06)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.1)]",
          )}
        >
          <Avatar
            size="sm"
            className={cn(isAssistant && "bg-transparent after:hidden")}
          >
            {isAssistant ? (
              <AvatarFallback className="bg-transparent p-0">
                <AiditrMark />
              </AvatarFallback>
            ) : (
              <AvatarFallback className="bg-ink/[0.06] text-[0.62rem] font-semibold text-ink-secondary dark:bg-white/10">
                {defaults.avatar}
              </AvatarFallback>
            )}
          </Avatar>
        </MessageAvatar>
      ) : null}
      <MessageContent
        className={cn(
          isAssistant && "gap-1.5",
          isUser && "max-w-[min(100%,34rem)]",
          isAssistant && "max-w-[min(100%,36rem)]",
          // Footer sits under bubble; avoid avatar vertical nudge fighting copy row.
          mergedFooter && "gap-1.5",
        )}
      >
        {header !== undefined ? (
          <MessageHeader
            className={cn(
              "text-[0.68rem] font-semibold tracking-[0.04em] uppercase text-ink-caption",
              isGhost && "px-0",
            )}
          >
            {header}
          </MessageHeader>
        ) : role !== "user" ? (
          <MessageHeader
            className={cn(
              "text-[0.68rem] font-semibold tracking-[0.04em] uppercase text-ink-caption",
              isGhost && "px-0",
            )}
          >
            {defaults.label}
          </MessageHeader>
        ) : null}
        <Bubble
          variant={bubbleVariant}
          align={align}
          className={cn(
            "max-w-full",
            isAssistant && !isGhost && "max-w-full",
            isUser && "max-w-full",
          )}
        >
          <BubbleContent
            className={cn(
              "text-[0.9rem] leading-[1.55]",
              isUser &&
                "rounded-[16px] rounded-br-[6px] px-3.5 py-2.5 font-medium tracking-[-0.01em]",
              isAssistant &&
                !isGhost &&
                "rounded-[16px] rounded-bl-[6px] px-3.5 py-2.5 ring-1 ring-black/[0.05] shadow-sm shadow-black/[0.03] dark:ring-white/[0.06]",
              isAssistant && isGhost && "px-0 py-0",
              bubbleVariant === "destructive" &&
                "rounded-[14px] ring-1 ring-destructive/15",
              useMarkdown && "whitespace-normal",
              !useMarkdown && isPlainString && lineLimit <= 0 && "whitespace-pre-wrap",
            )}
          >
            {body}
          </BubbleContent>
        </Bubble>
        {mergedFooter ? (
          <MessageFooter
            className={cn(
              "px-1",
              isGhost && "px-0",
              // Soften the default footer spacing for the copy control.
              "min-h-7 gap-1",
            )}
          >
            {mergedFooter}
          </MessageFooter>
        ) : null}
      </MessageContent>
    </Message>
  );
}
