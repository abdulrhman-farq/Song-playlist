import type { SVGProps } from "react";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number;
}

function Svg({
  size = 18,
  fill = "none",
  stroke = "currentColor",
  strokeWidth = 1.5,
  children,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconPlay = (p: IconProps) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M7 5.5v13l11-6.5z" />
  </Svg>
);
export const IconPause = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 5v14M16 5v14" />
  </Svg>
);
export const IconPrev = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 5v14M19 5l-9 7 9 7z" fill="currentColor" stroke="currentColor" />
  </Svg>
);
export const IconNext = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 5v14M5 5l9 7-9 7z" fill="currentColor" stroke="currentColor" />
  </Svg>
);
export const IconVol = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    <path d="M16 8.5a4.5 4.5 0 0 1 0 7" />
    <path d="M18.5 6a8 8 0 0 1 0 12" />
  </Svg>
);
export const IconMute = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    <path d="M16 9l5 6M21 9l-5 6" />
  </Svg>
);
export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M5 18h14" />
  </Svg>
);
export const IconYT = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="3" />
    <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="currentColor" />
  </Svg>
);
export const IconImport = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v12M7 11l5 5 5-5" />
    <path d="M5 20h14" />
  </Svg>
);
export const IconExport = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20V8M7 13l5-5 5 5" />
    <path d="M5 4h14" />
  </Svg>
);
export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </Svg>
);
export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4l11-11-4-4L4 16v4z" />
  </Svg>
);
export const IconDrag = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12l5 5L20 7" />
  </Svg>
);
export const IconMusic = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 18V6l10-2v12" />
    <circle cx="6" cy="18" r="2.5" fill="currentColor" stroke="currentColor" />
    <circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="currentColor" />
  </Svg>
);
export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </Svg>
);
export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5z"
      fill="currentColor"
      stroke="currentColor"
    />
  </Svg>
);
export const IconShuffle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h4l10 12h4M3 18h4L17 6h4M18 3l3 3-3 3M18 15l3 3-3 3" />
  </Svg>
);
export const IconRepeat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
  </Svg>
);

/** Small ornamental petal/diamond used in divider-orn and the header. */
export const OrnamentMark = ({ size = 10, color = "#D89274" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 14 14" width={size} height={size} aria-hidden="true">
    <path d="M7 1 Q3 7 7 13 Q11 7 7 1Z" fill={color} />
  </svg>
);

/** Logo monogram — small framed mark used in the header. */
export const LogoMark = ({ size = 32 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    style={{ opacity: 0.85 }}
  >
    <circle cx="32" cy="32" r="30" stroke="#D89274" strokeWidth="0.8" />
    <circle cx="32" cy="32" r="24" stroke="#B8956A" strokeWidth="0.5" />
    <path
      d="M32 8 Q22 32 32 56 Q42 32 32 8Z"
      fill="none"
      stroke="#D89274"
      strokeWidth="0.8"
    />
    <path
      d="M8 32 Q32 22 56 32 Q32 42 8 32Z"
      fill="none"
      stroke="#D89274"
      strokeWidth="0.8"
    />
    <circle cx="32" cy="32" r="3" fill="#D89274" />
  </svg>
);
