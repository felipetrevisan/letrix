import { describe, expect, it } from "bun:test";
import {
  normalizeWord,
  resolveValidDailyPuzzleRows,
  resolveLanguageFromLocale,
  unicodeLength,
} from "../src/lib/words";

describe("words", () => {
  it("normalizes accents and cedilla", () => {
    expect(normalizeWord("AÇÃO")).toBe("acao");
    expect(normalizeWord("maçã")).toBe("maca");
  });

  it("resolves locale to game language", () => {
    expect(resolveLanguageFromLocale("pt-BR")).toBe("pt");
    expect(resolveLanguageFromLocale("en-US")).toBe("en");
    expect(resolveLanguageFromLocale("en")).toBe("en");
  });

  it("calculates unicode grapheme length", () => {
    expect(unicodeLength("ação")).toBe(4);
  });

  it("rejects duplicated board indexes in daily puzzle rows", () => {
    const rows = [
      {
        board_index: 0,
        solution_normalized: "casa",
        solution_display: "casa",
      },
      {
        board_index: 0,
        solution_normalized: "mesa",
        solution_display: "mesa",
      },
      {
        board_index: 1,
        solution_normalized: "pato",
        solution_display: "pato",
      },
    ];

    expect(resolveValidDailyPuzzleRows(rows, 2, 4)).toEqual([]);
  });
});
