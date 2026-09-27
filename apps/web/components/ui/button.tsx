import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Pill buttons from the landing (`btn`, `btn-primary`, `btn-ink`, `btn-outline`
 * in globals.css). Primary = accent fill, one per view. Ink = secondary solid
 * action inside tools. Outline / ghost for everything else.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent font-medium tracking-[-0.01em] whitespace-nowrap select-none transition-[color,background-color,border-color,transform,opacity] duration-[180ms] ease-standard active:not-disabled:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:not-disabled:bg-accent-hover",
        ink: "bg-ink text-ink-fg hover:not-disabled:bg-ink-hover",
        outline:
          "border-border-strong bg-bg text-fg hover:not-disabled:border-fg",
        secondary:
          "border-border bg-surface text-fg hover:not-disabled:border-fg",
        ghost: "text-muted hover:not-disabled:bg-band hover:not-disabled:text-fg",
        destructive:
          "border-border-strong bg-bg text-danger hover:not-disabled:border-danger",
        link: "h-auto! rounded-none px-0! text-accent-text link-draw",
      },
      size: {
        default: "h-12 gap-2.5 px-[22px] text-[15px]",
        lg: "h-14 gap-2.5 px-7 text-[16px]",
        sm: "h-9 gap-2 px-3.5 text-[13px]",
        xs: "h-7 gap-1.5 px-2.5 text-[12px]",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
