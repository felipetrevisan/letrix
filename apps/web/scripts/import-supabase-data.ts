import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type Language = "pt" | "en";

type WordInput = {
  language: Language;
  word?: string;
  normalized_word?: string;
  display_word?: string;
  definition?: string | null;
  word_length?: number;
  is_solution?: boolean;
  is_active?: boolean;
};

type PuzzleInput = {
  puzzle_date: string;
  language: Language;
  mode: number;
  board_index: number;
  solution?: string;
  solution_normalized?: string;
  solution_display?: string;
};

const modeConfig: Record<number, { boards: number; wordLength: number }> = {
  1: { boards: 1, wordLength: 5 },
  2: { boards: 2, wordLength: 5 },
  3: { boards: 3, wordLength: 5 },
  4: { boards: 4, wordLength: 5 },
  5: { boards: 1, wordLength: 10 },
};

const normalizeWord = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
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

const hasFlag = (flag: string) => {
  return process.argv.includes(flag);
};

const cwd = process.cwd();
const repoRoot = fs.existsSync(path.resolve(cwd, "supabase"))
  ? cwd
  : path.resolve(cwd, "../..");
const defaultWordsPath = path.resolve(repoRoot, "supabase/data/words.json");
const defaultPuzzlesPath = path.resolve(repoRoot, "supabase/data/puzzles.json");

const resolveInputPath = (value: string | null, defaultPath: string) => {
  if (!value) {
    return defaultPath;
  }

  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
};

const wordsFile = resolveInputPath(getArgValue("--words"), defaultWordsPath);
const puzzlesFile = resolveInputPath(
  getArgValue("--puzzles"),
  defaultPuzzlesPath,
);
const isDryRun = hasFlag("--dry-run");
const shouldTruncate = hasFlag("--truncate");

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "Missing env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const LETRIX_SCHEMA = "letrix";

const formatUnknownError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const normalized = {
      message: record.message,
      code: record.code,
      details: record.details,
      hint: record.hint,
      status: record.status,
      name: record.name,
    };

    try {
      return JSON.stringify(normalized);
    } catch {
      return String(error);
    }
  }

  return String(error);
};

const readJsonArray = <T>(filePath: string, rootKey: string): T[] => {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(content) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as T[];
  }

  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;

    if (Array.isArray(record[rootKey])) {
      return record[rootKey] as T[];
    }
  }

  throw new Error(
    `Invalid JSON format in ${filePath}. Expected an array or an object with key '${rootKey}'.`,
  );
};

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const validateLanguage = (language: string): language is Language => {
  return language === "pt" || language === "en";
};

const toWordRow = (input: WordInput) => {
  if (!validateLanguage(input.language)) {
    throw new Error(
      `Invalid language '${String(input.language)}' in words import.`,
    );
  }

  const displayWord = (
    input.display_word ??
    input.word ??
    input.normalized_word ??
    ""
  ).trim();
  const normalizedWord = normalizeWord(
    input.normalized_word ?? input.word ?? displayWord,
  );

  if (!normalizedWord) {
    throw new Error(
      "Invalid word row: missing word/normalized_word/display_word.",
    );
  }

  const wordLength = input.word_length ?? Array.from(normalizedWord).length;

  return {
    language: input.language,
    normalized_word: normalizedWord,
    display_word: displayWord || normalizedWord,
    definition: input.definition?.trim() || null,
    word_length: wordLength,
    is_solution: input.is_solution ?? true,
    is_active: input.is_active ?? true,
  };
};

const toPuzzleRow = (input: PuzzleInput) => {
  if (!validateLanguage(input.language)) {
    throw new Error(
      `Invalid language '${String(input.language)}' in puzzles import.`,
    );
  }

  if (!modeConfig[input.mode]) {
    throw new Error(`Invalid mode '${input.mode}' in puzzles import.`);
  }

  if (
    input.board_index < 0 ||
    input.board_index >= modeConfig[input.mode].boards
  ) {
    throw new Error(
      `Invalid board_index '${input.board_index}' for mode '${input.mode}'.`,
    );
  }

  const display = (
    input.solution_display ??
    input.solution ??
    input.solution_normalized ??
    ""
  ).trim();
  const normalized = normalizeWord(
    input.solution_normalized ?? input.solution ?? display,
  );

  if (!normalized) {
    throw new Error(
      "Invalid puzzle row: missing solution/solution_normalized/solution_display.",
    );
  }

  const expectedLength = modeConfig[input.mode].wordLength;
  const actualLength = Array.from(normalized).length;

  if (actualLength !== expectedLength) {
    throw new Error(
      `Invalid solution length for mode ${input.mode}: expected ${expectedLength}, got ${actualLength} (${normalized}).`,
    );
  }

  return {
    puzzle_date: input.puzzle_date,
    language: input.language,
    mode: input.mode,
    board_index: input.board_index,
    solution_normalized: normalized,
    solution_display: display || normalized,
  };
};

const run = async () => {
  const wordsRaw = readJsonArray<WordInput>(wordsFile, "words");
  const puzzlesRaw = readJsonArray<PuzzleInput>(puzzlesFile, "puzzles");

  const words = wordsRaw.map(toWordRow);
  const puzzles = puzzlesRaw.map(toPuzzleRow);

  console.log(`Words file: ${wordsFile} (${words.length} rows)`);
  console.log(`Puzzles file: ${puzzlesFile} (${puzzles.length} rows)`);
  console.log(`Schema: ${LETRIX_SCHEMA}`);
  console.log(`Mode: ${isDryRun ? "dry-run" : "write"}`);

  if (isDryRun) {
    return;
  }

  if (shouldTruncate) {
    console.log("Truncating existing words and puzzles...");

    const { error: deletePuzzlesError } = await supabase
      .schema(LETRIX_SCHEMA)
      .from("daily_puzzles")
      .delete()
      .gte("id", 0);

    if (deletePuzzlesError) {
      throw new Error(
        `[truncate daily_puzzles] ${formatUnknownError(deletePuzzlesError)}`,
      );
    }

    const { error: deleteWordsError } = await supabase
      .schema(LETRIX_SCHEMA)
      .from("words")
      .delete()
      .neq("normalized_word", "");

    if (deleteWordsError) {
      throw new Error(
        `[truncate words] ${formatUnknownError(deleteWordsError)}`,
      );
    }
  }

  for (const [index, batch] of chunk(words, 500).entries()) {
    const { error } = await (
      supabase.schema(LETRIX_SCHEMA).from("words") as any
    ).upsert(batch, {
      onConflict: "language,normalized_word",
    });

    if (error) {
      throw new Error(
        `[words upsert batch ${index + 1}] ${formatUnknownError(error)}`,
      );
    }

    console.log(
      `Imported words batch ${index + 1}/${Math.max(1, Math.ceil(words.length / 500))}`,
    );
  }

  for (const [index, batch] of chunk(puzzles, 500).entries()) {
    const { error } = await (
      supabase.schema(LETRIX_SCHEMA).from("daily_puzzles") as any
    ).upsert(batch, {
      onConflict: "puzzle_date,language,mode,board_index",
    });

    if (error) {
      throw new Error(
        `[daily_puzzles upsert batch ${index + 1}] ${formatUnknownError(error)}`,
      );
    }

    console.log(
      `Imported puzzles batch ${index + 1}/${Math.max(1, Math.ceil(puzzles.length / 500))}`,
    );
  }

  console.log("Import finished successfully.");
};

run().catch((error) => {
  console.error("Import failed:", formatUnknownError(error));
  process.exit(1);
});
