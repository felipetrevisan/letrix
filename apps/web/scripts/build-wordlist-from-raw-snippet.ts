import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

type WordLength = 5 | 10;
type Language = "pt";

type WordOutput = {
  language: Language;
  word: string;
  display_word: string;
  definition: null;
  word_length: WordLength;
  is_solution: boolean;
  is_active: true;
};

type PuzzleOutput = {
  puzzle_date: string;
  language: Language;
  mode: 1 | 2 | 3 | 4 | 5;
  board_index: number;
  solution: string;
  solution_display: string;
};

type WordsFile = {
  source: string;
  generated_at: string;
  language: Language;
  word_lengths: WordLength[];
  total_words: number;
  words: WordOutput[];
};

type PuzzlesFile = {
  source: string;
  generated_at: string;
  start_date: string;
  total_days: number;
  total_puzzles: number;
  puzzles: PuzzleOutput[];
};

const DEFAULT_INPUT = "supabase/data/raw-wordlist-snippet.txt";
const DEFAULT_START_DATE = "2024-01-01";
const DEFAULT_DAYS = 5000;
const OUTPUT_WORDS = "supabase/data/words.json";
const OUTPUT_PUZZLES = "supabase/data/puzzles.json";

const modeConfig = {
  1: { boards: 1, wordLength: 5 as WordLength },
  2: { boards: 2, wordLength: 5 as WordLength },
  3: { boards: 3, wordLength: 5 as WordLength },
  4: { boards: 4, wordLength: 5 as WordLength },
  5: { boards: 5, wordLength: 5 as WordLength },
} as const;

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

const resolveRepoRoot = () => {
  const cwd = process.cwd();
  return fs.existsSync(path.resolve(cwd, "supabase"))
    ? cwd
    : path.resolve(cwd, "../..");
};

const normalizeWord = (value: string) =>
  value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const unicodeLength = (value: string) =>
  Array.from(value.normalize("NFC")).length;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const hashString = (value: string) => {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const extractSegment = (source: string, marker: string) => {
  const markerIndex = source.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const startIndex = source.indexOf("=", markerIndex) + 1;
  if (startIndex === 0) {
    return null;
  }

  const startToken = source[startIndex];

  if (startToken !== "{" && startToken !== "[") {
    return null;
  }

  const matchingToken = startToken === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let stringDelimiter = "";
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === stringDelimiter) {
        inString = false;
        stringDelimiter = "";
      }

      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      inString = true;
      stringDelimiter = character;
      continue;
    }

    if (character === startToken) {
      depth += 1;
    } else if (character === matchingToken) {
      depth -= 1;

      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
};

const extractSetExpression = (source: string) => {
  const match = source.match(/(?:new\s+)?Set\s*\(/);

  if (!match || match.index === undefined) {
    return null;
  }

  const start = match.index;
  const openParenIndex = source.indexOf("(", start);
  if (openParenIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let stringDelimiter = "";
  let escaped = false;

  for (let index = openParenIndex; index < source.length; index += 1) {
    const character = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === stringDelimiter) {
        inString = false;
        stringDelimiter = "";
      }

      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      inString = true;
      stringDelimiter = character;
      continue;
    }

    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(start, index + 1).replace(/^Set\s*\(/, "new Set(");
      }
    }
  }

  return null;
};

const parseSnippet = (rawContent: string) => {
  const setExpression = extractSetExpression(rawContent);
  const accentMapExpression = extractSegment(rawContent, "Yf");
  const solutionsExpression = extractSegment(rawContent, "Pf");

  if (!setExpression) {
    throw new Error("Could not find Set([...]) expression in the snippet.");
  }

  if (!accentMapExpression) {
    throw new Error("Could not find Yf={...} accent map in the snippet.");
  }

  if (!solutionsExpression) {
    throw new Error("Could not find Pf=[...] solutions array in the snippet.");
  }

  const words = vm.runInNewContext(setExpression) as Set<string>;
  const accentMap = vm.runInNewContext(`(${accentMapExpression})`) as Record<
    string,
    string
  >;
  const solutions = vm.runInNewContext(`(${solutionsExpression})`) as string[];

  if (
    !words ||
    typeof words !== "object" ||
    typeof (words as Set<string>).has !== "function" ||
    typeof (words as Set<string>).size !== "number"
  ) {
    throw new Error("Parsed word source is not Set-like.");
  }

  if (!Array.isArray(solutions)) {
    throw new Error("Parsed Pf source is not an array.");
  }

  if (!accentMap || typeof accentMap !== "object") {
    throw new Error("Parsed Yf source is not an object.");
  }

  return {
    words: Array.from(words),
    accentMap,
    solutions,
  };
};

const buildWordRows = ({
  sourceWords,
  accentMap,
  solutions,
}: {
  sourceWords: string[];
  accentMap: Record<string, string>;
  solutions: string[];
}) => {
  const rows: WordOutput[] = [];
  const seen = new Set<string>();
  const normalizedSolutions = new Set(
    solutions.map((solution) => normalizeWord(solution)),
  );

  const addWord = (rawWord: string, isSolution: boolean) => {
    const normalizedWord = normalizeWord(rawWord);
    const displayWord = accentMap[normalizedWord] ?? rawWord.normalize("NFC");
    const wordLength = unicodeLength(displayWord);

    if (wordLength !== 5 && wordLength !== 10) {
      return;
    }

    if (!normalizedWord || seen.has(normalizedWord)) {
      return;
    }

    seen.add(normalizedWord);

    rows.push({
      language: "pt",
      word: normalizedWord,
      display_word: displayWord,
      definition: null,
      word_length: wordLength,
      is_solution: isSolution,
      is_active: true,
    });
  };

  for (const rawWord of sourceWords) {
    addWord(rawWord, normalizedSolutions.has(normalizeWord(rawWord)));
  }

  for (const rawSolution of solutions) {
    addWord(rawSolution, true);
  }

  return rows.sort((left, right) =>
    left.word.localeCompare(right.word, "pt-BR"),
  );
};

const buildPuzzles = ({
  words,
  startDate,
  days,
}: {
  words: WordOutput[];
  startDate: Date;
  days: number;
}) => {
  const solutionsByLength = words.reduce<Record<WordLength, WordOutput[]>>(
    (accumulator, row) => {
      if (!accumulator[row.word_length]) {
        accumulator[row.word_length] = [];
      }

      if (row.is_solution) {
        accumulator[row.word_length].push(row);
      }

      return accumulator;
    },
    { 5: [], 10: [] },
  );

  const puzzles: PuzzleOutput[] = [];

  for (let day = 0; day < days; day += 1) {
    const puzzleDate = toIsoDate(addDays(startDate, day));

    for (const [modeRaw, config] of Object.entries(modeConfig)) {
      const mode = Number(modeRaw) as PuzzleOutput["mode"];
      const pool = solutionsByLength[config.wordLength];

      if (pool.length < config.boards) {
        continue;
      }

      const usedIndexes = new Set<number>();

      for (let boardIndex = 0; boardIndex < config.boards; boardIndex += 1) {
        let index =
          hashString(`${puzzleDate}:pt:${mode}:${boardIndex}`) % pool.length;
        let attempts = 0;

        while (usedIndexes.has(index) && attempts < pool.length) {
          index = (index + 1) % pool.length;
          attempts += 1;
        }

        usedIndexes.add(index);
        const word = pool[index];

        puzzles.push({
          puzzle_date: puzzleDate,
          language: "pt",
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
  const repoRoot = resolveRepoRoot();
  const inputPath = path.resolve(
    repoRoot,
    getArgValue("--input") ?? DEFAULT_INPUT,
  );
  const outWords = path.resolve(
    repoRoot,
    getArgValue("--out-words") ?? OUTPUT_WORDS,
  );
  const outPuzzles = path.resolve(
    repoRoot,
    getArgValue("--out-puzzles") ?? OUTPUT_PUZZLES,
  );
  const days = Number.parseInt(getArgValue("--days") ?? `${DEFAULT_DAYS}`, 10);
  const startDateInput = getArgValue("--start-date") ?? DEFAULT_START_DATE;
  const startDate = new Date(`${startDateInput}T00:00:00.000Z`);

  if (!fs.existsSync(inputPath)) {
    throw new Error(
      `Input file not found: ${inputPath}. Save the raw snippet there or pass --input.`,
    );
  }

  if (!Number.isFinite(days) || days <= 0) {
    throw new Error("Invalid --days value. Use an integer > 0.");
  }

  if (Number.isNaN(startDate.valueOf())) {
    throw new Error("Invalid --start-date. Use YYYY-MM-DD.");
  }

  const rawContent = fs.readFileSync(inputPath, "utf8");
  const { words: sourceWords, accentMap, solutions } = parseSnippet(rawContent);
  const words = buildWordRows({
    sourceWords,
    accentMap,
    solutions,
  });
  const puzzles = buildPuzzles({
    words,
    startDate,
    days,
  });

  const wordsPayload: WordsFile = {
    source: inputPath,
    generated_at: new Date().toISOString(),
    language: "pt",
    word_lengths: [5],
    total_words: words.length,
    words,
  };

  const puzzlesPayload: PuzzlesFile = {
    source: inputPath,
    generated_at: new Date().toISOString(),
    start_date: toIsoDate(startDate),
    total_days: days,
    total_puzzles: puzzles.length,
    puzzles,
  };

  fs.mkdirSync(path.dirname(outWords), { recursive: true });
  fs.mkdirSync(path.dirname(outPuzzles), { recursive: true });
  fs.writeFileSync(outWords, JSON.stringify(wordsPayload, null, 2) + "\n");
  fs.writeFileSync(outPuzzles, JSON.stringify(puzzlesPayload, null, 2) + "\n");

  console.log(`Input: ${inputPath}`);
  console.log(`Words written: ${outWords} (${words.length})`);
  console.log(`Puzzles written: ${outPuzzles} (${puzzles.length})`);
  console.log(`Start date: ${toIsoDate(startDate)}`);
  console.log(`Days generated: ${days}`);
};

run();
