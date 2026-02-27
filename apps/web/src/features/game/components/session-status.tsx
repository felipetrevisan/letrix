"use client";

import { CheckCircle2, Infinity, Keyboard, Target } from "lucide-react";
import type { ComponentType } from "react";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { cn } from "@/lib/utils";

type Props = {
  attemptsLeft: number;
  solvedBoards: number;
  totalBoards: number;
  currentStreak: number;
  layout?: "default" | "sidebar";
};

type StatCardProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  pulse?: boolean;
  large?: boolean;
};

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  pulse = false,
  large = false,
}: StatCardProps) {
  return (
    <article
      className={cn(
        "rounded-xl border border-border/65 bg-background/80",
        large ? "px-4 py-4" : "px-3 py-2",
        pulse && "border-primary/45 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]",
      )}
    >
      <div
        className={cn(
          "mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground",
          large && "justify-center text-xs",
        )}
      >
        <Icon className={cn("size-3.5", large && "size-4")} />
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "flex items-baseline gap-1 text-foreground",
          large && "justify-center gap-2",
        )}
      >
        <SlidingNumber
          number={value}
          fromNumber={0}
          delay={60}
          className={cn(
            "font-mono font-semibold tabular-nums",
            large ? "text-4xl leading-none" : "text-xl",
          )}
        />
        {suffix && (
          <span
            className={cn(
              "font-mono tabular-nums text-foreground/80",
              large ? "text-lg" : "text-sm",
            )}
          >
            {suffix}
          </span>
        )}
      </div>
    </article>
  );
}

const shortcutItems = [
  { key: "Enter", label: "confirmar" },
  { key: "Backspace", label: "apagar" },
  { key: "← / →", label: "mover casa" },
] as const;

export function SessionStatus({
  attemptsLeft,
  solvedBoards,
  totalBoards,
  currentStreak,
  layout = "default",
}: Props) {
  const solvedAllBoards = totalBoards > 0 && solvedBoards === totalBoards;
  const isSidebarLayout = layout === "sidebar";

  return (
    <section
      className={cn(
        "space-y-2",
        isSidebarLayout
          ? "w-full max-w-[min(100vw-2rem,22rem)] xl:w-80 xl:max-w-none"
          : "w-full max-w-[min(100vw-2rem,64rem)]",
      )}
    >
      <div
        className={cn(
          "grid gap-2",
          isSidebarLayout ? "grid-cols-1" : "grid-cols-2 md:grid-cols-4",
        )}
      >
        <StatCard
          icon={Target}
          label="Tentativas restantes"
          value={attemptsLeft}
          pulse={attemptsLeft <= 2}
          large={isSidebarLayout}
        />
        <StatCard
          icon={CheckCircle2}
          label="Tabuleiros resolvidos"
          value={solvedBoards}
          suffix={`/ ${totalBoards}`}
          pulse={solvedAllBoards}
          large={isSidebarLayout}
        />
        <StatCard
          icon={Infinity}
          label="Sequência atual"
          value={currentStreak}
          large={isSidebarLayout}
        />
        <article
          className={cn(
            "rounded-xl border border-border/65 bg-background/80",
            isSidebarLayout ? "px-4 py-4" : "px-3 py-2",
          )}
        >
          <div
            className={cn(
              "mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground",
              isSidebarLayout && "justify-center text-xs",
            )}
          >
            <Keyboard className={cn("size-3.5", isSidebarLayout && "size-4")} />
            <span>Atalhos</span>
          </div>
          <div
            className={cn(
              "flex flex-wrap gap-1.5",
              isSidebarLayout && "justify-center gap-2",
            )}
          >
            {shortcutItems.map((item) => (
              <span
                key={item.key}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border border-border/65 bg-muted/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] text-foreground",
                  isSidebarLayout && "px-2.5 py-1 text-[11px]",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[10px] text-foreground/90",
                    isSidebarLayout && "text-[11px]",
                  )}
                >
                  {item.key}
                </span>
                <span className="text-muted-foreground">{item.label}</span>
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
