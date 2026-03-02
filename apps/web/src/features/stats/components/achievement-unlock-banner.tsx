"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { StatsAchievement } from "@/features/stats/lib/stats-insights";
import { MOTION_EASE, MOTION_DURATION } from "@/config/motion";

type Props = {
  achievement: StatsAchievement | null;
  isVisible: boolean;
};

export function AchievementUnlockBanner({ achievement, isVisible }: Props) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {achievement ? (
        <motion.div
          key={achievement.id}
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scaleX: 0.3, y: 34, filter: "blur(10px)" }
          }
          animate={
            isVisible
              ? shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, scaleX: 1, y: 0, filter: "blur(0px)" }
              : shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scaleX: 0.62, y: 28, filter: "blur(6px)" }
          }
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scaleX: 0.42, y: 42, filter: "blur(8px)" }
          }
          transition={{
            duration: shouldReduceMotion
              ? MOTION_DURATION.xs
              : MOTION_DURATION.lg + 0.08,
            ease: MOTION_EASE.standard,
          }}
          className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4"
        >
          <div className="relative w-full max-w-[26rem] overflow-hidden rounded-[1.4rem] border border-cyan-400/35 bg-[linear-gradient(135deg,hsl(var(--background)/0.96),hsl(var(--primary)/0.12)_42%,hsl(var(--background)/0.94))] px-4 py-3 shadow-[0_18px_48px_-24px_hsl(var(--primary)/0.45),0_0_0_1px_hsl(var(--primary)/0.14)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,hsl(var(--primary)/0.08)_28%,transparent_56%,hsl(var(--accent)/0.08)_78%,transparent_100%)]" />
            <div className="relative flex items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/12 shadow-[0_0_24px_hsl(var(--primary)/0.22)]">
                <Image
                  src="/brand/letrix-logo.png"
                  alt="Letrix"
                  width={36}
                  height={36}
                  className="size-9 rounded-xl"
                />
              </div>

              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cyan-200/90">
                  Conquista desbloqueada
                </p>
                <p className="mt-1 text-lg font-semibold leading-tight text-foreground">
                  {achievement.label}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
