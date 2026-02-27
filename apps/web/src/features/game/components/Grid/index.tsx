"use client";

import { Fragment } from "react";
import { useGame } from "@/contexts/GameContext";
import { Row } from "../Row";

type Props = {
  index: number;
  isRevealing?: boolean;
  isEndGame?: boolean;
  isGameOver?: boolean;
  isWon?: boolean;
  currentRowClass: string;
  rowAnimation: string | null;
};

export function Grid({ index, currentRowClass, rowAnimation }: Props) {
  const { getMaxChallenges } = useGame();

  return (
    <div className="board-shell w-fit max-w-full rounded-xl border border-border/60 bg-background/70 p-2 md:p-2.5">
      {Array.from({ length: getMaxChallenges() }).map((_, rowIndex) => (
        <Fragment key={`fragment_row_${index}_${rowIndex}`}>
          <Row
            key={`row_${index}_${rowIndex}`}
            index={rowIndex}
            board={index}
            className={currentRowClass}
            animation={rowAnimation}
          />
        </Fragment>
      ))}
    </div>
  );
}
