"use client";

import type { ReactNode } from "react";

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { cn } from "@/lib/utils";

export type ChatThreadProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** When true, show jump-to-latest control. */
  showScrollButton?: boolean;
};

/**
 * Scrollable conversation column built on shadcn MessageScroller.
 * Drop AiMessage / ChatStatusMarker / arbitrary content as children.
 */
export function ChatThread({
  children,
  className,
  contentClassName,
  showScrollButton = true,
}: ChatThreadProps) {
  return (
    <MessageScrollerProvider>
      <MessageScroller className={cn("min-h-0 flex-1", className)}>
        <MessageScrollerViewport>
          <MessageScrollerContent
            className={cn("gap-5 px-0.5 py-1.5", contentClassName)}
          >
            {children}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        {showScrollButton ? <MessageScrollerButton direction="end" /> : null}
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

export type ChatThreadItemProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  /** Mark as scroll anchor (e.g. latest streaming/status row). */
  scrollAnchor?: boolean;
};

export function ChatThreadItem({
  children,
  id,
  className,
  scrollAnchor = false,
}: ChatThreadItemProps) {
  return (
    <MessageScrollerItem
      id={id}
      scrollAnchor={scrollAnchor}
      className={cn(className)}
    >
      {children}
    </MessageScrollerItem>
  );
}
