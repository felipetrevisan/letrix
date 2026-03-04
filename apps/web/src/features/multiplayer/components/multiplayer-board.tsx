"use client";

import { cn } from "@/lib/utils";
import type {
  MultiplayerMaskedAttempt,
  MultiplayerPrivateAttempt,
} from "@/features/multiplayer/lib/types";

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
};

const buildMaskedGlyph = (length: number) => "✱".repeat(length);

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
}: Props) {
  const normalizedCurrentLetters = currentGuess.slice(0, wordLength).split("");

  return (
    <section className="surface-panel w-full max-w-md p-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </header>

      <div className="grid gap-1.5">
        {Array.from({ length: maxAttempts }, (_, rowIndex) => {
          const attempt = attempts[rowIndex];
          const isCurrentRow = !attempt && rowIndex === attempts.length;
          const currentMask = buildMaskedGlyph(wordLength).split("");
          const currentLetters = maskLetters
            ? currentMask
            : normalizedCurrentLetters;

          return (
            <div
              key={rowIndex}
              className="row flex justify-center"
              data-animation="idle"
            >
              {Array.from({ length: wordLength }, (_, tileIndex) => {
                const status =
                  attempt && "statuses" in attempt
                    ? attempt.statuses[tileIndex]
                    : undefined;
                const letter = attempt
                  ? "guess" in attempt
                    ? attempt.guess[tileIndex] ?? ""
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
