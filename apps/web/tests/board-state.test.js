import { describe, expect, it } from "bun:test";
import {
  getBoardGuessedIndex,
  getBoardRowState,
} from "../src/features/game/session/board-state";

describe("board state", () => {
  it("locks solved board and keeps unsolved board interactive in duo", () => {
    const guessesWords = ["casa"];

    const solvedBoardRow = getBoardRowState({
      rowIndex: 1,
      currentRow: 1,
      boardSolution: "casa",
      guessWordAtRow: undefined,
      guessesWords,
    });

    const unsolvedBoardRow = getBoardRowState({
      rowIndex: 1,
      currentRow: 1,
      boardSolution: "pato",
      guessWordAtRow: undefined,
      guessesWords,
    });

    expect(solvedBoardRow.isBoardSolved).toBe(true);
    expect(solvedBoardRow.isInteractiveCurrentRow).toBe(false);
    expect(solvedBoardRow.rowStatus).toBe("blank");

    expect(unsolvedBoardRow.isBoardSolved).toBe(false);
    expect(unsolvedBoardRow.isInteractiveCurrentRow).toBe(true);
    expect(unsolvedBoardRow.rowStatus).toBe("guessing");
  });

  it("in trio keeps only unsolved board interactive on current row", () => {
    const guessesWords = ["pato", "muro"];

    const board0 = getBoardRowState({
      rowIndex: 2,
      currentRow: 2,
      boardSolution: "casa",
      guessWordAtRow: undefined,
      guessesWords,
    });

    const board1 = getBoardRowState({
      rowIndex: 2,
      currentRow: 2,
      boardSolution: "pato",
      guessWordAtRow: undefined,
      guessesWords,
    });

    const board2 = getBoardRowState({
      rowIndex: 2,
      currentRow: 2,
      boardSolution: "muro",
      guessWordAtRow: undefined,
      guessesWords,
    });

    expect(board0.isInteractiveCurrentRow).toBe(true);
    expect(board1.isInteractiveCurrentRow).toBe(false);
    expect(board2.isInteractiveCurrentRow).toBe(false);
  });

  it("in quarteto allows all unsolved boards to remain active", () => {
    const guessesWords = ["casa", "lago"];

    const board0 = getBoardRowState({
      rowIndex: 1,
      currentRow: 1,
      boardSolution: "casa",
      guessWordAtRow: undefined,
      guessesWords,
    });
    const board1 = getBoardRowState({
      rowIndex: 1,
      currentRow: 1,
      boardSolution: "pato",
      guessWordAtRow: undefined,
      guessesWords,
    });
    const board2 = getBoardRowState({
      rowIndex: 1,
      currentRow: 1,
      boardSolution: "muro",
      guessWordAtRow: undefined,
      guessesWords,
    });
    const board3 = getBoardRowState({
      rowIndex: 1,
      currentRow: 1,
      boardSolution: "lago",
      guessWordAtRow: undefined,
      guessesWords,
    });

    expect(board0.isInteractiveCurrentRow).toBe(false);
    expect(board3.isInteractiveCurrentRow).toBe(false);
    expect(board1.isInteractiveCurrentRow).toBe(true);
    expect(board2.isInteractiveCurrentRow).toBe(true);
  });

  it("marks row as done when that row guessed the board solution", () => {
    const guessesWords = ["casa"];

    expect(getBoardGuessedIndex(guessesWords, "casa")).toBe(0);

    const rowState = getBoardRowState({
      rowIndex: 0,
      currentRow: 1,
      boardSolution: "casa",
      guessWordAtRow: "casa",
      guessesWords,
    });

    expect(rowState.isGuessedRow).toBe(true);
    expect(rowState.rowStatus).toBe("done");
  });
});
