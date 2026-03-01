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
  total_words?: number;
  words: WordRow[];
};

type PuzzlesFile = {
  total_puzzles?: number;
  puzzles: PuzzleRow[];
};

const hasPortugueseVowel = (value: string) =>
  /[aeiouáàâãéêíóôõúü]/i.test(value.normalize("NFC"));

const normalizeWord = (value: string) =>
  value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

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
    if (row.language !== "pt") {
      return true;
    }

    const normalized =
      row.normalized_word ?? row.word ?? normalizeWord(row.display_word);
    const shouldRemove =
      row.word_length === 5 && !hasPortugueseVowel(row.display_word);

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

    return !removedWords.has(normalized);
  });

  wordsPayload.words = nextWords;
  puzzlesPayload.puzzles = nextPuzzles;

  if (typeof wordsPayload.total_words === "number") {
    wordsPayload.total_words = nextWords.length;
  }

  if (typeof puzzlesPayload.total_puzzles === "number") {
    puzzlesPayload.total_puzzles = nextPuzzles.length;
  }

  fs.writeFileSync(wordsPath, JSON.stringify(wordsPayload, null, 2) + "\n");
  fs.writeFileSync(puzzlesPath, JSON.stringify(puzzlesPayload, null, 2) + "\n");

  console.log(`Removed vowelless pt words: ${removedWords.size}`);
  console.log(`Remaining words: ${nextWords.length}`);
  console.log(`Remaining puzzles: ${nextPuzzles.length}`);
};

run();
