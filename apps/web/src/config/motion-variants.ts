import { MOTION_DURATION, MOTION_EASE } from "@/config/motion";

type FadeUpOptions = {
  distance?: number;
  duration?: number;
  delay?: number;
  reducedMotion?: boolean;
};

type ScaleInOptions = {
  y?: number;
  scale?: number;
  blur?: string;
  duration?: number;
  delay?: number;
  reducedMotion?: boolean;
};

export const staggerDelay = (index: number, step: number, max: number) =>
  Math.min(index * step, max);

export const createFadeUpMotion = ({
  distance = 16,
  duration = MOTION_DURATION.md,
  delay = 0,
  reducedMotion = false,
}: FadeUpOptions = {}) => ({
  initial: { opacity: 0, y: reducedMotion ? 0 : distance },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: reducedMotion ? MOTION_DURATION.xs : duration,
    delay: reducedMotion ? 0 : delay,
    ease: MOTION_EASE.out,
  },
});

export const createScaleInMotion = ({
  y = 14,
  scale = 0.94,
  blur = "blur(2px)",
  duration = MOTION_DURATION.boardEnter,
  delay = 0,
  reducedMotion = false,
}: ScaleInOptions = {}) => ({
  initial: {
    opacity: 0,
    y: reducedMotion ? 0 : y,
    scale: reducedMotion ? 1 : scale,
    filter: reducedMotion ? "blur(0px)" : blur,
  },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  transition: {
    duration: reducedMotion ? MOTION_DURATION.xs : duration,
    delay: reducedMotion ? 0 : delay,
    ease: MOTION_EASE.out,
  },
});
