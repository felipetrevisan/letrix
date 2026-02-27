import { unicodeSplit } from "@/lib/words";
import { getGuessStatuses } from "@/lib/statuses";
import { Tile } from "./index";

type Props = {
  guess: string;
  solution: string;
  isRevealing?: boolean;
  isEndGame?: boolean;
};

export function CompletedTile({
  guess,
  solution,
  isRevealing = false,
  isEndGame = false,
}: Props) {
  const splitGuess = unicodeSplit(guess);
  const statuses = getGuessStatuses(splitGuess, solution);

  return (
    <>
      {splitGuess.map((letter, i) => (
        <Tile
          key={i}
          value={letter}
          status={statuses[i]}
          position={i}
          isRevealing={isRevealing}
          isCompleted
          isActive={false}
          isEndGame={isEndGame}
        />
      ))}
    </>
  );
}
