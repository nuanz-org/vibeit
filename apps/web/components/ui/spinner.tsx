import { cn } from "@/lib/utils"

/**
 * "Working" indicator. The design language has no spinners: busy is a
 * blinking 6px accent-text dot (`.live-dot`), usually beside a status label.
 */
function Spinner({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(
        "live-dot inline-block size-1.5 shrink-0 rounded-full bg-accent-text",
        className
      )}
      {...props}
    />
  )
}

export { Spinner }
