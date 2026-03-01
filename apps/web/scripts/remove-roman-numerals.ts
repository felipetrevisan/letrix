import fs from "node:fs";
import path from "node:path";

type Language = "pt" | "en";

type WordRow = {
  language: Language;
  word?: string;
  normalized_word?: string;
  display_word: string;
  definition?: string | null;
  word_length: number;
  is_solution: boolean;
  is_active: boolean;
};

type PuzzleRow = {
  puzzle_date: string;
  language: Language;
  mode: number;
  board_index: number;
  solution?: string;
  solution_normalized?: string;
  solution_display: string;
};

type WordsFile = {
  words: WordRow[];
};

type PuzzlesFile = {
  puzzles: PuzzleRow[];
};

const getArgValue = (flag: string) => {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return null;
  }

  const value = process.argv[index + 1];

  if (!value || value.startsWith("--")) {
    return null;
  }

  return value;
};

const normalizeWord = (value: string) =>
  value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const isRomanNumeral = (value: string) => {
  const normalized = value.trim().toLowerCase();

  return (
    /^[ivxlcdm]+$/i.test(normalized) &&
    /^(?=[ivxlcdm]+$)m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i.test(
      normalized,
    )
  );
};

const run = () => {
  const cwd = process.cwd();
  const repoRoot = fs.existsSync(path.resolve(cwd, "supabase"))
    ? cwd
    : path.resolve(cwd, "../..");

  const wordsPath = path.resolve(
    repoRoot,
    getArgValue("--words") ?? "supabase/data/words.json",
  );
  const puzzlesPath = path.resolve(
    repoRoot,
    getArgValue("--puzzles") ?? "supabase/data/puzzles.json",
  );

  const wordsPayload = JSON.parse(
    fs.readFileSync(wordsPath, "utf8"),
  ) as WordsFile;
  const puzzlesPayload = JSON.parse(
    fs.readFileSync(puzzlesPath, "utf8"),
  ) as PuzzlesFile;

  const removedWords = new Set<string>();
  const nextWords = wordsPayload.words.filter((row) => {
    const normalized =
      row.normalized_word ?? row.word ?? normalizeWord(row.display_word);
    const shouldRemove =
      isRomanNumeral(row.display_word) || isRomanNumeral(normalized);

    if (shouldRemove) {
      removedWords.add(normalized);
    }

    return !shouldRemove;
  });

  const nextPuzzles = puzzlesPayload.puzzles.filter((row) => {
    const normalized =
      row.solution_normalized ??
      row.solution ??
      normalizeWord(row.solution_display);

    return !removedWords.has(normalized) && !isRomanNumeral(normalized);
  });

  wordsPayload.words = nextWords;
  puzzlesPayload.puzzles = nextPuzzles;

  if (
    "total_words" in wordsPayload &&
    typeof (wordsPayload as any).total_words === "number"
  ) {
    (wordsPayload as any).total_words = nextWords.length;
  }

  if (
    "total_puzzles" in puzzlesPayload &&
    typeof (puzzlesPayload as any).total_puzzles === "number"
  ) {
    (puzzlesPayload as any).total_puzzles = nextPuzzles.length;
  }

  fs.writeFileSync(wordsPath, JSON.stringify(wordsPayload, null, 2) + "\n");
  fs.writeFileSync(puzzlesPath, JSON.stringify(puzzlesPayload, null, 2) + "\n");

  console.log(`Removed words: ${removedWords.size}`);
  console.log(`Remaining words: ${nextWords.length}`);
  console.log(`Remaining puzzles: ${nextPuzzles.length}`);
};

run();
