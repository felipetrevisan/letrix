"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type {
  MultiplayerMaskedAttempt,
  MultiplayerPrivateAttempt,
} from "@/features/multiplayer/lib/types";
import { REVEAL_TIME_MS } from "@/config/settings";

type Props = {
  title: string;
  subtitle: string;
  attempts: MultiplayerPrivateAttempt[] | MultiplayerMaskedAttempt[];
  currentGuess?: string;
  selectedTileIndex?: number;
  onSelectTile?: (index: number) => void;
  maskLetters?: boolean;
  isInteractive?: boolean;
  maxAttempts: number;
  wordLength: number;
  animatedAttempt?: MultiplayerPrivateAttempt | null;
  animation?: "revealing" | null;
};

const buildMaskedGlyph = (length: number) => "✱".repeat(length);
const isPrivateAttempt = (
  attempt: MultiplayerPrivateAttempt | MultiplayerMaskedAttempt | null,
): attempt is MultiplayerPrivateAttempt => {
  return Boolean(
    attempt &&
      "guess" in attempt &&
      typeof (attempt as { guess?: unknown }).guess === "string",
  );
};

export function MultiplayerBoard({
  title,
  subtitle,
  attempts,
  currentGuess = "",
  selectedTileIndex = 0,
  onSelectTile,
  maskLetters = false,
  isInteractive = false,
  maxAttempts,
  wordLength,
  animatedAttempt = null,
  animation = null,
}: Props) {
  const normalizedCurrentLetters = currentGuess.slice(0, wordLength).split("");

  return (
    <section className="surface-panel flex w-full max-w-md flex-col items-center p-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="w-full text-center">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </header>

      <div className="grid w-full justify-items-center gap-1.5">
        {Array.from({ length: maxAttempts }, (_, rowIndex) => {
          const attempt = attempts[rowIndex];
          const isAnimatedRow =
            Boolean(animatedAttempt) && rowIndex === attempts.length;
          const displayedAttempt = isAnimatedRow ? animatedAttempt : attempt;
          const isCurrentRow = !attempt && rowIndex === attempts.length;
          const currentMask = buildMaskedGlyph(wordLength).split("");
          const currentLetters = maskLetters
            ? currentMask
            : normalizedCurrentLetters;

          return (
            <div
              key={rowIndex}
              className="row flex justify-center"
              data-animation={isAnimatedRow ? animation : "idle"}
            >
              {Array.from({ length: wordLength }, (_, tileIndex) => {
                const status =
                  displayedAttempt && "statuses" in displayedAttempt
                    ? displayedAttempt.statuses[tileIndex]
                    : undefined;
                const letter = displayedAttempt
                  ? isPrivateAttempt(displayedAttempt)
                    ? displayedAttempt.guess[tileIndex] ?? ""
                    : currentMask[tileIndex] ?? ""
                  : isCurrentRow
                    ? currentLetters[tileIndex] ?? ""
                    : "";

                return (
                  <button
                    key={`${rowIndex}-${tileIndex}`}
                    type="button"
                    className={cn(
                      "tile small",
                      status,
                      isCurrentRow &&
                        isInteractive &&
                        selectedTileIndex === tileIndex &&
                        "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]",
                    )}
                    data-revealed={Boolean(status)}
                    disabled={!isInteractive || !isCurrentRow}
                    onClick={() => onSelectTile?.(tileIndex)}
                    style={
                      isAnimatedRow
                        ? ({
                            "--reveal-delay": `${REVEAL_TIME_MS * (tileIndex + 1)}ms`,
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    <div className="tile-inner">
                      <div className="tile-face tile-face-front">{letter}</div>
                      <div className="tile-face tile-face-back">
                        {maskLetters && status ? "✱" : letter}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
