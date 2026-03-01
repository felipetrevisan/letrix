import fs from "node:fs";
import path from "node:path";

type WordLength = 5 | 10;

type Language = "pt";

type WordOutput = {
  language: Language;
  word: string;
  display_word: string;
  definition: null;
  word_length: WordLength;
  is_solution: true;
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

const SOURCE_URL =
  "https://raw.githubusercontent.com/kkrypt0nn/wordlists/refs/heads/main/wordlists/languages/portuguese.txt";
const DEFAULT_DAYS = 5000;
const DEFAULT_START_DATE = "2024-01-01";
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

const normalizeWord = (value: string) =>
  value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const countLetters = (value: string) =>
  Array.from(value.normalize("NFC")).filter((character) =>
    /\p{Letter}/u.test(character),
  ).length;

const isOnlyLetters = (value: string) => /^\p{Letter}+$/u.test(value);
const hasPortugueseVowel = (value: string) =>
  /[aeiouáàâãéêíóôõúü]/i.test(value.normalize("NFC"));

const isRomanNumeral = (value: string) => {
  const normalized = value.trim().toLowerCase();

  return (
    /^[ivxlcdm]+$/i.test(normalized) &&
    /^(?=[ivxlcdm]+$)m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i.test(
      normalized,
    )
  );
};

const hashString = (value: string) => {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const resolveRepoRoot = () => {
  const cwd = process.cwd();
  return fs.existsSync(path.resolve(cwd, "supabase"))
    ? cwd
    : path.resolve(cwd, "../..");
};

const buildWordRows = (content: string) => {
  const seen = new Set<string>();
  const words: WordOutput[] = [];

  for (const rawEntry of content.split(/\r?\n/)) {
    const displayWord = rawEntry.normalize("NFC").trim().toLowerCase();

    if (!displayWord || !isOnlyLetters(displayWord)) {
      continue;
    }

    const wordLength = countLetters(displayWord);

    if (wordLength !== 5 && wordLength !== 10) {
      continue;
    }

    if (isRomanNumeral(displayWord)) {
      continue;
    }

    if (!hasPortugueseVowel(displayWord)) {
      continue;
    }

    const normalizedWord = normalizeWord(displayWord);

    if (!normalizedWord || seen.has(normalizedWord)) {
      continue;
    }

    seen.add(normalizedWord);
    words.push({
      language: "pt",
      word: normalizedWord,
      display_word: displayWord,
      definition: null,
      word_length: wordLength,
      is_solution: true,
      is_active: true,
    });
  }

  return words.sort((left, right) =>
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

      accumulator[row.word_length].push(row);
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

const run = async () => {
  const repoRoot = resolveRepoRoot();
  const outWords = path.resolve(
    repoRoot,
    getArgValue("--out-words") ?? OUTPUT_WORDS,
  );
  const outPuzzles = path.resolve(
    repoRoot,
    getArgValue("--out-puzzles") ?? OUTPUT_PUZZLES,
  );
  const sourceUrl = getArgValue("--url") ?? SOURCE_URL;
  const days = Number.parseInt(getArgValue("--days") ?? `${DEFAULT_DAYS}`, 10);
  const startDateInput = getArgValue("--start-date") ?? DEFAULT_START_DATE;
  const startDate = new Date(`${startDateInput}T00:00:00.000Z`);

  if (!Number.isFinite(days) || days <= 0) {
    throw new Error("Invalid --days value. Use an integer > 0.");
  }

  if (Number.isNaN(startDate.valueOf())) {
    throw new Error("Invalid --start-date. Use YYYY-MM-DD.");
  }

  const response = await fetch(sourceUrl, {
    headers: { accept: "text/plain" },
  });

  if (!response.ok) {
    throw new Error(`Failed to download word list: HTTP ${response.status}`);
  }

  const content = await response.text();
  const words = buildWordRows(content);
  const puzzles = buildPuzzles({
    words,
    startDate,
    days,
  });

  const wordsPayload: WordsFile = {
    source: sourceUrl,
    generated_at: new Date().toISOString(),
    language: "pt",
    word_lengths: [5, 10],
    total_words: words.length,
    words,
  };

  const puzzlesPayload: PuzzlesFile = {
    source: sourceUrl,
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

  console.log(`Source: ${sourceUrl}`);
  console.log(`Words written: ${outWords} (${words.length})`);
  console.log(`Puzzles written: ${outPuzzles} (${puzzles.length})`);
  console.log(`Start date: ${toIsoDate(startDate)}`);
  console.log(`Days generated: ${days}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
