import { describe, expect, it } from "bun:test";
import {
  normalizeWord,
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
});
