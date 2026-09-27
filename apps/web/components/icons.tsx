import type { SVGProps } from "react";

/**
 * House icon set, copied from aiditr-landing/features/landing/ui/icons.tsx:
 * 16×16 viewBox, 1.5px stroke, round caps/joins, currentColor, no fill
 * (except Play). Render at 12–18px. Lucide at 1.5px strokes is the fallback
 * for anything missing here.
 */
type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </Svg>
);

export const ArrowLeft = (p: P) => (
  <Svg {...p}>
    <path d="M13 8H3M7 4L3 8l4 4" />
  </Svg>
);

export const ArrowUpRight = (p: P) => (
  <Svg {...p}>
    <path d="M5 11l6-6M6 5h5v5" />
  </Svg>
);

export const Play = (p: P) => (
  <Svg {...p}>
    <path d="M5 3.5v9l7-4.5-7-4.5z" fill="currentColor" stroke="none" />
  </Svg>
);

export const Pause = (p: P) => (
  <Svg {...p}>
    <path d="M5.5 3.5v9M10.5 3.5v9" strokeWidth={2} />
  </Svg>
);

export const Download = (p: P) => (
  <Svg {...p}>
    <path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" />
  </Svg>
);

export const ImageIcon = (p: P) => (
  <Svg {...p}>
    <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
    <circle cx="6" cy="6.5" r="1" />
    <path d="M13.5 10.5L10.5 7.5 4 13" />
  </Svg>
);

export const Check = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 8.5l3 3 6-7" />
  </Svg>
);

export const Plus = (p: P) => (
  <Svg {...p}>
    <path d="M8 3v10M3 8h10" />
  </Svg>
);

export const Close = (p: P) => (
  <Svg {...p}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Svg>
);

export const Menu = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 5.5h11M2.5 10.5h11" />
  </Svg>
);

export const ChevronLeft = (p: P) => (
  <Svg {...p}>
    <path d="M10 3.5L5.5 8l4.5 4.5" />
  </Svg>
);

export const ChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="M6 3.5L10.5 8 6 12.5" />
  </Svg>
);

export const ChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 6l4.5 4.5L12.5 6" />
  </Svg>
);

export const Sun = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="2.75" />
    <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
  </Svg>
);

export const Moon = (p: P) => (
  <Svg {...p}>
    <path d="M13 9.5A5.5 5.5 0 116.5 3a4.5 4.5 0 006.5 6.5z" />
  </Svg>
);

export const Monitor = (p: P) => (
  <Svg {...p}>
    <rect x="2" y="3" width="12" height="8" rx="1.5" />
    <path d="M6 14h4M8 11v3" />
  </Svg>
);

export const LinkIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 014 4l-1 1M9 11.5l-1 1a2.8 2.8 0 01-4-4l1-1" />
  </Svg>
);

export const Code = (p: P) => (
  <Svg {...p}>
    <path d="M5.5 5L2.5 8l3 3M10.5 5l3 3-3 3" />
  </Svg>
);

export const Remix = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 5h7.5a3 3 0 010 6H6M4.5 3L2.5 5l2 2M8 9l-2 2 2 2" />
  </Svg>
);

/* App additions, drawn to the same grid. */

export const Pencil = (p: P) => (
  <Svg {...p}>
    <path d="M10.5 3l2.5 2.5-7 7-3 .5.5-3 7-7z" />
  </Svg>
);

export const PanelLeft = (p: P) => (
  <Svg {...p}>
    <rect x="2" y="2.5" width="12" height="11" rx="2" />
    <path d="M6 2.5v11" />
  </Svg>
);

export const Upload = (p: P) => (
  <Svg {...p}>
    <path d="M8 10.5v-8M4.5 6L8 2.5 11.5 6M3 13.5h10" />
  </Svg>
);

export const Copy = (p: P) => (
  <Svg {...p}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5V4A1.5 1.5 0 009 2.5H4A1.5 1.5 0 002.5 4v5A1.5 1.5 0 004 10.5h1.5" />
  </Svg>
);

export const ArrowUp = (p: P) => (
  <Svg {...p}>
    <path d="M8 13V3M4 7l4-4 4 4" />
  </Svg>
);

export const Globe = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M2.5 8h11M8 2.5c1.5 1.6 2.25 3.4 2.25 5.5S9.5 11.9 8 13.5M8 2.5C6.5 4.1 5.75 5.9 5.75 8S6.5 11.9 8 13.5" />
  </Svg>
);

export const Alert = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 5v3.5M8 11h.01" />
  </Svg>
);
