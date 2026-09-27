import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
      {...props}
    />
  )
}

/**
 * Chat bubbles from the landing (HowItWorks.tsx §3.14): 10px radius,
 * ink for the person, a hairline surface card for Aiditr. Monochrome only —
 * blue is never a bubble fill, and errors are ink text on a stronger edge.
 * `tinted` and `secondary` are kept for API compatibility and read as band.
 */
const bubbleVariants = cva(
  "group/bubble relative flex w-fit max-w-[85%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full",
  {
    variants: {
      variant: {
        default:
          "*:data-[slot=bubble-content]:bg-ink *:data-[slot=bubble-content]:text-ink-fg [&>[data-slot=bubble-content]:is(button,a):hover]:bg-ink-hover",
        secondary:
          "*:data-[slot=bubble-content]:bg-band *:data-[slot=bubble-content]:text-fg [&>[data-slot=bubble-content]:is(button,a):hover]:border-border",
        muted:
          "*:data-[slot=bubble-content]:bg-band *:data-[slot=bubble-content]:text-fg [&>[data-slot=bubble-content]:is(button,a):hover]:border-border",
        tinted:
          "*:data-[slot=bubble-content]:bg-band *:data-[slot=bubble-content]:text-fg [&>[data-slot=bubble-content]:is(button,a):hover]:border-border",
        outline:
          "*:data-[slot=bubble-content]:border-border *:data-[slot=bubble-content]:bg-surface *:data-[slot=bubble-content]:text-fg [&>[data-slot=bubble-content]:is(button,a):hover]:border-fg",
        ghost:
          "*:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0 *:data-[slot=bubble-content]:text-fg",
        destructive:
          "*:data-[slot=bubble-content]:border-border-strong *:data-[slot=bubble-content]:bg-surface *:data-[slot=bubble-content]:text-fg [&>[data-slot=bubble-content]:is(button,a):hover]:border-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end"
  }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  )
}

function BubbleContent({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "w-fit max-w-full min-w-0 overflow-hidden rounded-[10px] border border-transparent px-3 py-2 text-[13.5px] leading-[1.55] wrap-break-word group-data-[align=end]/bubble:self-end [button]:text-left [button,a]:transition-colors [button,a]:duration-fast [button,a]:ease-standard",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "bubble-content",
    },
  })
}

const bubbleReactionsVariants = cva(
  "absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[12px] has-[button]:p-0",
  {
    variants: {
      side: {
        top: "top-0 -translate-y-3/4",
        bottom: "bottom-0 translate-y-3/4",
      },
      align: {
        start: "left-3",
        end: "right-3",
      },
    },
    defaultVariants: {
      side: "bottom",
      align: "end",
    },
  }
)

function BubbleReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end"
  side?: "top" | "bottom"
}) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  )
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions }
