export const MOTION_EASE = {
  standard: [0.22, 1, 0.36, 1] as const,
  in: [0.4, 0, 1, 1] as const,
  out: [0.16, 1, 0.3, 1] as const,
};

export const MOTION_DURATION = {
  xs: 0.12,
  sm: 0.16,
  base: 0.18,
  md: 0.22,
  boardEnter: 0.24,
  lg: 0.28,
  xl: 0.36,
  xxl: 0.42,
};

export const MOTION_DELAY = {
  brandChildren: 0.08,
  brandWordChildren: 0.1,
  brandLetterStagger: 0.05,
};

export const MOTION_CLASS = {
  widthPaddingGap:
    "transition-[width,padding,gap] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
  padding:
    "transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
} as const;

export const DIALOG_SPRING = {
  type: "spring" as const,
  stiffness: 280,
  damping: 28,
  mass: 0.75,
};
