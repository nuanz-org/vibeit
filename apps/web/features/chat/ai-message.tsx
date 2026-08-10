"use client";

import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
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
  /** Override bubble variant. Defaults: user=default, assistant=outline, system=muted. */
  variant?: "default" | "secondary" | "muted" | "outline" | "ghost" | "destructive";
  showAvatar?: boolean;
};

function roleDefaults(role: AiMessageRole): {
  align: "start" | "end";
  variant: NonNullable<AiMessageProps["variant"]>;
  label: string;
  avatar: string;
} {
  switch (role) {
    case "user":
      return {
        align: "end",
        variant: "default",
        label: "You",
        avatar: "You",
      };
    case "system":
      return {
        align: "start",
        variant: "muted",
        label: "System",
        avatar: "·",
      };
    case "assistant":
    default:
      return {
        align: "start",
        variant: "outline",
        label: "Aiditr",
        avatar: "Ai",
      };
  }
}

/**
 * Thin product wrapper over shadcn Message + Bubble for AI/chat rows.
 * Presentational only — no job/API logic.
 */
export function AiMessage({
  role,
  children,
  header,
  footer,
  className,
  variant,
  showAvatar = true,
}: AiMessageProps) {
  const defaults = roleDefaults(role);
  const align = defaults.align;
  const bubbleVariant = variant ?? defaults.variant;

  return (
    <Message align={align} className={cn(className)}>
      {showAvatar ? (
        <MessageAvatar>
          <Avatar size="sm">
            <AvatarFallback className="text-[0.65rem] font-semibold">
              {defaults.avatar}
            </AvatarFallback>
          </Avatar>
        </MessageAvatar>
      ) : null}
      <MessageContent>
        {header !== undefined ? (
          <MessageHeader>{header}</MessageHeader>
        ) : role !== "user" ? (
          <MessageHeader>{defaults.label}</MessageHeader>
        ) : null}
        <Bubble variant={bubbleVariant} align={align}>
          <BubbleContent className="whitespace-pre-wrap">{children}</BubbleContent>
        </Bubble>
        {footer ? <MessageFooter>{footer}</MessageFooter> : null}
      </MessageContent>
    </Message>
  );
}
