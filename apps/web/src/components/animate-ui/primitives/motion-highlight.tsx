"use client";

import { motion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

type MotionHighlightProps = {
  active: boolean;
  layoutId: string;
  className?: string;
  transition?: Transition;
};

export function MotionHighlight({
  active,
  layoutId,
  className,
  transition = { type: "spring", stiffness: 360, damping: 34, mass: 0.55 },
}: MotionHighlightProps) {
  if (!active) {
    return null;
  }

  return (
    <motion.span
      layout
      layoutId={layoutId}
      transition={transition}
      className={cn("pointer-events-none absolute inset-0 block", className)}
      aria-hidden="true"
    />
  );
}
