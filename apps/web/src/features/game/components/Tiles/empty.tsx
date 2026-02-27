import { MAX_WORD_LENGTH } from "@/config/settings";
import { Tile } from "./index";

export function EmptyTile() {
  const emptyTiles = Array.from({ length: MAX_WORD_LENGTH });

  return (
    <>
      {emptyTiles.map((_, index) => (
        <Tile key={index} isActive={false} isEndGame={false} />
      ))}
    </>
  );
}
