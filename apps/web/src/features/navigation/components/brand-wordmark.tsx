"use client";

import { motion } from "motion/react";
import { MOTION_DELAY, MOTION_DURATION, MOTION_EASE } from "@/config/motion";
import { cn } from "@/lib/utils";

const brandLetters = ["L", "E", "T", "R", "I", "X"] as const;

const getBrandContainerVariants = (reducedMotion: boolean) => ({
  collapsed: {
    width: 40,
    transition: {
      duration: reducedMotion ? MOTION_DURATION.xs : MOTION_DURATION.lg,
      ease: MOTION_EASE.standard,
    },
  },
  expanded: {
    width: 172,
    transition: {
      duration: reducedMotion ? MOTION_DURATION.xs : MOTION_DURATION.xxl,
      ease: MOTION_EASE.standard,
      when: "beforeChildren" as const,
      delayChildren: reducedMotion ? 0 : MOTION_DELAY.brandChildren,
      staggerChildren: reducedMotion ? 0 : MOTION_DELAY.brandLetterStagger,
    },
  },
});

const getBrandLetterVariants = (reducedMotion: boolean) => ({
  collapsed: {
    opacity: 0,
    y: reducedMotion ? 0 : 4,
    transition: {
      duration: reducedMotion ? MOTION_DURATION.xs : MOTION_DURATION.xs,
      ease: MOTION_EASE.in,
    },
  },
  expanded: {
    opacity: 1,
    y: 0,
    transition: {
      duration: reducedMotion ? MOTION_DURATION.xs : MOTION_DURATION.base,
      ease: MOTION_EASE.out,
    },
  },
});

const getBrandWordVariants = (reducedMotion: boolean) => ({
  collapsed: {
    opacity: 0,
    x: reducedMotion ? 0 : -6,
    maxWidth: 0,
    transition: {
      duration: reducedMotion ? MOTION_DURATION.xs : MOTION_DURATION.sm,
      ease: MOTION_EASE.in,
    },
  },
  expanded: {
    opacity: 1,
    x: 0,
    maxWidth: 120,
    transition: {
      duration: reducedMotion ? MOTION_DURATION.xs : MOTION_DURATION.md,
      ease: MOTION_EASE.out,
      delayChildren: reducedMotion ? 0 : MOTION_DELAY.brandWordChildren,
      staggerChildren: reducedMotion ? 0 : MOTION_DELAY.brandLetterStagger,
    },
  },
});

type BrandWordmarkProps = {
  expanded?: boolean;
  reducedMotion: boolean;
  animated?: boolean;
  className?: string;
};

export function BrandWordmark({
  expanded = true,
  reducedMotion,
  animated = false,
  className,
}: BrandWordmarkProps) {
  const containerVariants = getBrandContainerVariants(reducedMotion);
  const letterVariants = getBrandLetterVariants(reducedMotion);
  const wordVariants = getBrandWordVariants(reducedMotion);

  if (!animated) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-3 text-foreground/90",
          className,
        )}
      >
        <img
          src="/brand/letrix-logo.svg"
          alt=""
          className="size-8 shrink-0 rounded-xl"
        />
        <span className="title text-xl tracking-[0.14em]">LETRIX</span>
      </span>
    );
  }

  return (
    <motion.span
      className={cn(
        "relative inline-flex h-full items-center overflow-hidden whitespace-nowrap",
        expanded ? "justify-start gap-2 pr-3" : "justify-center gap-0 pr-0",
        className,
      )}
      initial={false}
      variants={containerVariants}
      animate={expanded ? "expanded" : "collapsed"}
    >
      <motion.img
        src="/brand/letrix-logo.svg"
        alt=""
        className="size-8 shrink-0 rounded-xl"
        initial={false}
        animate={{
          scale: expanded ? 1 : 0.95,
          opacity: 1,
        }}
        transition={{
          duration: reducedMotion ? MOTION_DURATION.xs : MOTION_DURATION.md,
          ease: MOTION_EASE.standard,
        }}
      />
      <motion.span
        className="title inline-flex items-center overflow-hidden text-lg leading-none tracking-[0.14em]"
        initial={false}
        variants={wordVariants}
        animate={expanded ? "expanded" : "collapsed"}
      >
        {brandLetters.map((letter) => (
          <motion.span key={letter} variants={letterVariants}>
            {letter}
          </motion.span>
        ))}
      </motion.span>
    </motion.span>
  );
}
