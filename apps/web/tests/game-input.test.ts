import { describe, expect, test } from "bun:test";
import {
  computeDeleteUpdate,
  computeTypingUpdate,
} from "../src/features/game/session/input";
import type { Guess } from "../src/interfaces/game";

const createGuess = (letters: string[] = []): Guess => ({
  row: 0,
  word: letters.join(""),
  letters,
  status: "initial",
  guessedRow: null,
});

describe("game input helpers", () => {
  test("typing updates the selected tile and jumps to the next empty tile", () => {
    const result = computeTypingUpdate({
      value: "a",
      currentSolution: "teste",
      maxChallenges: 6,
      isGameLocked: false,
      guessesLength: 0,
      currentGuess: createGuess(["", "", "t", "", ""]),
      currentRow: 1,
      selectedTileIndex: 1,
    });

    expect(result.shouldUpdate).toBe(true);
    if (!result.shouldUpdate) return;

    expect(result.nextGuess.letters).toEqual(["", "a", "t", "", ""]);
    expect(result.nextGuess.word).toBe("at");
    expect(result.nextGuess.row).toBe(1);
    expect(result.nextTileIndex).toBe(3);
  });

  test("typing does nothing when game is locked", () => {
    const result = computeTypingUpdate({
      value: "a",
      currentSolution: "teste",
      maxChallenges: 6,
      isGameLocked: true,
      guessesLength: 0,
      currentGuess: createGuess(["", "", "", "", ""]),
      currentRow: 0,
      selectedTileIndex: 0,
    });

    expect(result).toEqual({ shouldUpdate: false });
  });

  test("delete removes the nearest filled tile to the left when current tile is empty", () => {
    const result = computeDeleteUpdate({
      currentGuess: createGuess(["t", "e", "", "", ""]),
      selectedTileIndex: 3,
      maxLength: 5,
    });

    expect(result.shouldUpdate).toBe(true);
    if (!result.shouldUpdate) return;

    expect(result.nextGuess.letters).toEqual(["t", "", "", "", ""]);
    expect(result.nextGuess.word).toBe("t");
    expect(result.nextTileIndex).toBe(1);
  });

  test("delete moves selection to zero when there are no letters", () => {
    const result = computeDeleteUpdate({
      currentGuess: createGuess(["", "", "", "", ""]),
      selectedTileIndex: 4,
      maxLength: 5,
    });

    expect(result.shouldUpdate).toBe(true);
    if (!result.shouldUpdate) return;

    expect(result.nextGuess.letters).toEqual(["", "", "", "", ""]);
    expect(result.nextTileIndex).toBe(0);
  });
});
