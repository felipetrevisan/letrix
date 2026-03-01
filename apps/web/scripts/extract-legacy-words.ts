import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

type Language = "pt" | "en";

type WordOutput = {
  language: Language;
  word: string;
  display_word: string;
  word_length: number;
  is_solution: boolean;
  is_active: boolean;
};

type PuzzleOutput = {
  puzzle_date: string;
  language: Language;
  mode: number;
  board_index: number;
  solution: string;
  solution_display: string;
};

const modeConfig: Record<number, { boards: number; wordLength: number }> = {
  1: { boards: 1, wordLength: 5 },
  2: { boards: 2, wordLength: 5 },
  3: { boards: 3, wordLength: 5 },
  4: { boards: 4, wordLength: 5 },
  5: { boards: 5, wordLength: 5 },
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

const hasFlag = (flag: string) => process.argv.includes(flag);

const normalizeWord = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const hashString = (value: string) => {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const extractStrings = (source: string, variableNames: string[]) => {
  const contentByName = variableNames
    .map((name) => {
      const pattern = new RegExp(
        String.raw`(?:export\s+)?(?:const|let|var)\s+${name}\s*=\s*\[([\s\S]*?)\]`,
        "m",
      );
      return source.match(pattern)?.[1] ?? null;
    })
    .find((content) => content !== null);

  const content = contentByName ?? source;
  const matches = [...content.matchAll(/["'`]([^"'`]+)["'`]/g)];

  return matches.map((entry) => entry[1].trim()).filter(Boolean);
};

const readLegacySource = ({
  filePath,
  gitRef,
  gitPath,
  label,
}: {
  filePath: string | null;
  gitRef: string;
  gitPath: string;
  label: string;
}) => {
  if (filePath) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`${label}: file not found at ${absolutePath}`);
    }

    return fs.readFileSync(absolutePath, "utf8");
  }

  try {
    return execFileSync("git", ["show", `${gitRef}:${gitPath}`], {
      encoding: "utf8",
    });
  } catch {
    return "";
  }
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const buildPuzzles = ({
  language,
  days,
  startDate,
  solutionRows,
}: {
  language: Language;
  days: number;
  startDate: Date;
  solutionRows: WordOutput[];
}) => {
  const solutionByLength = solutionRows.reduce<Record<number, WordOutput[]>>(
    (accumulator, row) => {
      if (!row.is_solution) {
        return accumulator;
      }

      if (!accumulator[row.word_length]) {
        accumulator[row.word_length] = [];
      }

      accumulator[row.word_length].push(row);
      return accumulator;
    },
    {},
  );

  const puzzles: PuzzleOutput[] = [];

  for (let day = 0; day < days; day += 1) {
    const puzzleDate = toIsoDate(addDays(startDate, day));

    for (const [modeRaw, config] of Object.entries(modeConfig)) {
      const mode = Number(modeRaw);
      const pool = (solutionByLength[config.wordLength] ?? [])
        .slice()
        .sort((left, right) => left.word.localeCompare(right.word));

      if (pool.length < config.boards) {
        continue;
      }

      const usedIndexes = new Set<number>();

      for (let boardIndex = 0; boardIndex < config.boards; boardIndex += 1) {
        let index =
          hashString(`${puzzleDate}:${language}:${mode}:${boardIndex}`) %
          pool.length;
        let attempts = 0;

        while (usedIndexes.has(index) && attempts < pool.length) {
          index = (index + 1) % pool.length;
          attempts += 1;
        }

        usedIndexes.add(index);
        const word = pool[index];

        puzzles.push({
          puzzle_date: puzzleDate,
          language,
          mode,
          board_index: boardIndex,
          solution: word.word,
          solution_display: word.display_word,
        });
      }
    }
  }

  return puzzles;
};

const run = () => {
  const cwd = process.cwd();
  const repoRoot = fs.existsSync(path.resolve(cwd, "supabase"))
    ? cwd
    : path.resolve(cwd, "../..");

  const languageArg = (getArgValue("--language") ?? "pt") as Language;
  const language: Language = languageArg === "en" ? "en" : "pt";

  const gitRef = getArgValue("--git-ref") ?? "HEAD";
  const solutionsFile = getArgValue("--solutions-file");
  const guessesFile = getArgValue("--guesses-file");
  const solutionsGitPath =
    getArgValue("--solutions-git-path") ?? "src/config/wordList.ts";
  const guessesGitPath =
    getArgValue("--guesses-git-path") ?? "src/config/validGuesses.ts";
  const outWords = getArgValue("--out-words") ?? "supabase/data/words.json";
  const outPuzzles =
    getArgValue("--out-puzzles") ?? "supabase/data/puzzles.json";
  const shouldGeneratePuzzles = hasFlag("--generate-puzzles");
  const days = Number(getArgValue("--days") ?? 365);
  const startDateInput = getArgValue("--start-date");
  const startDate = startDateInput
    ? new Date(`${startDateInput}T00:00:00.000Z`)
    : new Date(`${toIsoDate(new Date())}T00:00:00.000Z`);

  if (Number.isNaN(days) || days <= 0) {
    throw new Error("Invalid --days value. Use an integer > 0.");
  }

  if (Number.isNaN(startDate.valueOf())) {
    throw new Error("Invalid --start-date. Use YYYY-MM-DD.");
  }

  const solutionsSource = readLegacySource({
    filePath: solutionsFile,
    gitRef,
    gitPath: solutionsGitPath,
    label: "solutions",
  });
  const guessesSource = readLegacySource({
    filePath: guessesFile,
    gitRef,
    gitPath: guessesGitPath,
    label: "guesses",
  });

  const rawSolutions = extractStrings(solutionsSource, [
    "solutions",
    "words",
    "wordList",
  ]);
  const rawGuesses = extractStrings(guessesSource, [
    "validGuesses",
    "guesses",
    "words",
  ]);

  if (!rawSolutions.length && !rawGuesses.length) {
    throw new Error(
      "No legacy words found. Pass --solutions-file/--guesses-file or --git-ref with valid legacy paths.",
    );
  }

  const byWord = new Map<string, WordOutput>();

  for (const wordRaw of rawSolutions) {
    const displayWord = wordRaw.trim();
    const word = normalizeWord(displayWord);

    if (!word) {
      continue;
    }

    byWord.set(word, {
      language,
      word,
      display_word: displayWord || word,
      word_length: Array.from(word).length,
      is_solution: true,
      is_active: true,
    });
  }

  for (const wordRaw of rawGuesses) {
    const displayWord = wordRaw.trim();
    const word = normalizeWord(displayWord);

    if (!word) {
      continue;
    }

    const existing = byWord.get(word);
    if (existing) {
      if (!existing.display_word && displayWord) {
        existing.display_word = displayWord;
      }
      continue;
    }

    byWord.set(word, {
      language,
      word,
      display_word: displayWord || word,
      word_length: Array.from(word).length,
      is_solution: false,
      is_active: true,
    });
  }

  const words = [...byWord.values()].sort((left, right) => {
    if (left.word_length !== right.word_length) {
      return left.word_length - right.word_length;
    }

    return left.word.localeCompare(right.word);
  });

  const outWordsPath = path.resolve(repoRoot, outWords);
  fs.mkdirSync(path.dirname(outWordsPath), { recursive: true });
  fs.writeFileSync(
    outWordsPath,
    `${JSON.stringify({ words }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Generated ${words.length} words -> ${outWordsPath}`);

  if (!shouldGeneratePuzzles) {
    return;
  }

  const puzzles = buildPuzzles({
    language,
    days,
    startDate,
    solutionRows: words.filter((entry) => entry.is_solution),
  });

  const outPuzzlesPath = path.resolve(repoRoot, outPuzzles);
  fs.mkdirSync(path.dirname(outPuzzlesPath), { recursive: true });
  fs.writeFileSync(
    outPuzzlesPath,
    `${JSON.stringify({ puzzles }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Generated ${puzzles.length} puzzles -> ${outPuzzlesPath}`);
};

run();
