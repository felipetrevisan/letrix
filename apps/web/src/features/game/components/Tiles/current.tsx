import { unicodeSplit } from "@/lib/words";
import { MAX_WORD_LENGTH } from "@/config/settings";
import { useGame } from "@/contexts/GameContext";
import { Tile } from "./index";

type Props = {
  guess: string;
  currentClass: string;
  isActive: boolean;
  isEndGame?: boolean;
};

export function CurrentTile({
  guess,
  currentClass,
  isActive,
  isEndGame,
}: Props) {
  const { selectedTileIndex } = useGame();

  const splitGuess = unicodeSplit(guess);
  const emptyTiles = Array.from({
    length: MAX_WORD_LENGTH - splitGuess.length,
  });

  return (
    <>
      {splitGuess.map((letter, index) => (
        <Tile
          key={index}
          value={letter}
          className={currentClass}
          isActive={isActive}
          isEndGame={isEndGame}
        />
      ))}
      {emptyTiles.map((_, index) => (
        <Tile
          key={index}
          className={currentClass}
          isSelected={index === selectedTileIndex}
          isActive={isActive}
          isEndGame={isEndGame}
        />
      ))}
    </>
  );
}
