/**
 * The Aiditr mark: a tile with two slider knobs, because Aiditr makes tools
 * with controls. Copied from aiditr-landing/features/landing/ui/Wordmark.tsx.
 * Blue is always #0000FF, never themed. Wrap in `.wm-link` so the knobs
 * slide apart on hover.
 */
export function Mark({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-hidden="true"
      focusable="false"
      className={`mark shrink-0 ${className}`}
    >
      <rect width="22" height="22" rx="6" fill="#0000FF" />
      <path
        d="M5.5 8.25h11M5.5 13.75h11"
        stroke="#fff"
        strokeOpacity="0.42"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        className="mark-knob-a"
        cx="13.25"
        cy="8.25"
        r="2.35"
        fill="#fff"
      />
      <circle
        className="mark-knob-b"
        cx="8.25"
        cy="13.75"
        r="2.35"
        fill="#fff"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`group/wm inline-flex items-center gap-2 ${className}`}>
      <Mark />
      <span className="text-[18px] font-semibold leading-none tracking-[-0.035em]">
        Aiditr
      </span>
    </span>
  );
}
