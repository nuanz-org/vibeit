"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Alert, Check, Copy } from "@/components/icons";
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
  /**
   * Override bubble variant. Defaults: user = default (ink),
   * assistant = outline (hairline surface card), system = muted (band).
   * `destructive` is ink text on a stronger edge with an alert icon — no red fill.
   */
  variant?:
    | "default"
    | "secondary"
    | "muted"
    | "outline"
    | "ghost"
    | "destructive"
    | "tinted";
  /**
   * Show a small monochrome avatar beside the bubble. Off by default: like
   * the landing chat, the speaker line ("Aiditr") carries identity.
   */
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
        // Ink bubble (landing §3.14). Blue is for "go", never a bubble.
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
        // Hairline surface card, same chrome as job progress / panels.
        variant: "outline",
        label: "Aiditr",
        avatar: "Ai",
        markdown: true,
      };
  }
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
  }, [maxLines]);

  // Re-measure when the text changes, as well as on resize.
  useLayoutEffect(() => {
    measure();
  }, [measure, text]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const clamped = maxLines > 0 && !expanded && canCollapse;

  return (
    <div className="flex min-w-0 flex-col gap-1">
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
            "cursor-pointer self-start border-0 bg-transparent p-0 text-left text-[12px] font-medium",
            "underline-offset-3 transition-[color,opacity] duration-fast ease-standard hover:underline",
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

/** Quiet 28px icon pill; flips to a check for a moment after copying. */
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
        "hit inline-grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-muted",
        "transition-[background-color,color,transform] duration-fast ease-standard",
        "hover:bg-band hover:text-fg active:scale-[0.985]",
        copied && "text-fg",
        className,
      )}
      onClick={() => void onCopy()}
      aria-label={copied ? "Copied" : "Copy message"}
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
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
  showAvatar = false,
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
  const isGhost = bubbleVariant === "ghost";
  const isDestructive = bubbleVariant === "destructive";
  const onInk = bubbleVariant === "default";

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
          onInk
            ? "text-ink-fg opacity-75 hover:opacity-100"
            : "text-muted hover:text-fg"
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

  const headerContent =
    header !== undefined ? header : role !== "user" ? defaults.label : null;

  return (
    <Message
      align={align}
      className={cn(
        "animate-[ai-msg-in_240ms_var(--ease)_both] motion-reduce:animate-none",
        className,
      )}
    >
      {showAvatar ? (
        <MessageAvatar>
          <Avatar size="sm">
            <AvatarFallback className="t-mono text-[10px]">
              {defaults.avatar}
            </AvatarFallback>
          </Avatar>
        </MessageAvatar>
      ) : null}
      <MessageContent
        className={cn(
          isUser ? "max-w-[min(100%,34rem)]" : "max-w-[min(100%,36rem)]",
        )}
      >
        {headerContent != null ? (
          <MessageHeader>
            {isDestructive ? (
              <Alert size={14} className="shrink-0 text-danger" />
            ) : null}
            {headerContent}
          </MessageHeader>
        ) : null}
        <Bubble
          variant={bubbleVariant}
          align={align}
          className={cn(isUser ? "max-w-[85%]" : "max-w-full")}
        >
          <BubbleContent
            className={cn(
              isGhost && "w-full",
              useMarkdown && "whitespace-normal",
              !useMarkdown &&
                isPlainString &&
                lineLimit <= 0 &&
                "whitespace-pre-wrap",
            )}
          >
            {body}
          </BubbleContent>
        </Bubble>
        {mergedFooter ? (
          <MessageFooter className="-mt-0.5 min-h-7 gap-1">
            {mergedFooter}
          </MessageFooter>
        ) : null}
      </MessageContent>
    </Message>
  );
}
