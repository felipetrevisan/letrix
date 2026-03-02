"use client";

import { motion, useReducedMotion } from "motion/react";
import { Award, CheckCircle2, LockKeyhole } from "lucide-react";
import { createFadeUpMotion, staggerDelay } from "@/config/motion-variants";
import { type GameStats } from "@/interfaces/game";
import { deriveStatsInsights } from "@/features/stats/lib/stats-insights";
import { Base } from "@/features/shared/components/dialog-base";

type Props = {
  isOpen: boolean;
  gameStats: GameStats;
  maxChallenges: number;
  handleClose: () => void;
  onBackToStats?: () => void;
};

export function AchievementsModal({
  isOpen,
  gameStats,
  maxChallenges,
  handleClose,
  onBackToStats,
}: Props) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const { achievements } = deriveStatsInsights(gameStats, maxChallenges);
  const unlockedCount = achievements.filter(
    (achievement) => achievement.unlocked,
  ).length;
  const normalAchievements = achievements.filter(
    (achievement) => achievement.category === "normal",
  );
  const secretAchievements = achievements.filter(
    (achievement) => achievement.category === "secret",
  );

  return (
    <Base
      title="Conquistas"
      isOpen={isOpen}
      showHeader
      handleClose={handleClose}
      contentScrollable
      className="max-w-5xl"
      buttons={
        onBackToStats
          ? [
              {
                label: "Voltar ao progresso",
                name: "back-to-stats",
                variant: { variant: "outline" as const },
                action: onBackToStats,
              },
            ]
          : undefined
      }
    >
      <div className="space-y-4 pb-3">
        <motion.section
          className="surface-panel flex items-center justify-between gap-4 p-4"
          {...createFadeUpMotion({
            distance: 10,
            reducedMotion: shouldReduceMotion,
          })}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/80">
              coleção
            </p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">
              {unlockedCount} de {achievements.length} desbloqueadas
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Continue jogando para liberar novos marcos de precisão, volume e
              sequência.
            </p>
          </div>

          <div className="surface-panel-card flex size-16 items-center justify-center rounded-2xl">
            <Award className="size-7 text-cyan-300" />
          </div>
        </motion.section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                Conquistas normais
              </h3>
              <p className="text-sm text-muted-foreground">
                Marcos visíveis de progresso e consistência.
              </p>
            </div>
            <div className="rounded-full border border-border/60 bg-muted/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {
                normalAchievements.filter((achievement) => achievement.unlocked)
                  .length
              }
              /{normalAchievements.length}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {normalAchievements.map((achievement, index) => (
              <motion.article
                key={achievement.id}
                className={
                  achievement.unlocked
                    ? "surface-panel-card flex min-h-36 flex-col justify-between gap-4 border-emerald-500/30 bg-emerald-500/8 p-4"
                    : "surface-panel-card flex min-h-36 flex-col justify-between gap-4 p-4"
                }
                {...createFadeUpMotion({
                  distance: 10,
                  delay: staggerDelay(index, 0.025, 0.12),
                  reducedMotion: shouldReduceMotion,
                })}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {achievement.label}
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {achievement.description}
                    </p>
                  </div>

                  {achievement.unlocked ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
                  ) : (
                    <LockKeyhole className="mt-0.5 size-5 shrink-0 text-muted-foreground/70" />
                  )}
                </div>

                <div
                  className={
                    achievement.unlocked
                      ? "inline-flex w-fit rounded-full border border-emerald-500/40 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300"
                      : "inline-flex w-fit rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  }
                >
                  {achievement.unlocked ? "Desbloqueada" : "Bloqueada"}
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                Conquistas secretas
              </h3>
              <p className="text-sm text-muted-foreground">
                Objetivos raros. As bloqueadas só revelam o segredo quando forem
                conquistadas.
              </p>
            </div>
            <div className="rounded-full border border-border/60 bg-muted/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {
                secretAchievements.filter((achievement) => achievement.unlocked)
                  .length
              }
              /{secretAchievements.length}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {secretAchievements.map((achievement, index) => {
              const isUnlocked = achievement.unlocked;
              const label = isUnlocked
                ? achievement.label
                : "Conquista secreta";
              const description = isUnlocked
                ? achievement.description
                : "Jogue para desbloquear.";

              return (
                <motion.article
                  key={achievement.id}
                  className={
                    isUnlocked
                      ? "surface-panel-card flex min-h-36 flex-col justify-between gap-4 border-fuchsia-400/28 bg-fuchsia-500/8 p-4"
                      : "surface-panel-card flex min-h-36 flex-col justify-between gap-4 border-border/50 bg-background/35 p-4"
                  }
                  {...createFadeUpMotion({
                    distance: 10,
                    delay: staggerDelay(
                      index + normalAchievements.length,
                      0.025,
                      0.12,
                    ),
                    reducedMotion: shouldReduceMotion,
                  })}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {label}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {description}
                      </p>
                    </div>

                    {isUnlocked ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-fuchsia-300" />
                    ) : (
                      <LockKeyhole className="mt-0.5 size-5 shrink-0 text-muted-foreground/70" />
                    )}
                  </div>

                  <div
                    className={
                      isUnlocked
                        ? "inline-flex w-fit rounded-full border border-fuchsia-400/35 bg-fuchsia-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fuchsia-200"
                        : "inline-flex w-fit rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                    }
                  >
                    {isUnlocked ? "Revelada" : "Oculta"}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      </div>
    </Base>
  );
}
