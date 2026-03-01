import fs from "node:fs";
import path from "node:path";

type Language = "pt" | "en";

type WordRow = {
  language: Language;
  word: string;
  display_word: string;
  definition?: string | null;
  word_length: number;
  is_solution: boolean;
  is_active: boolean;
};

type WordsFile = {
  words: WordRow[];
};

type PuzzleRow = {
  puzzle_date: string;
  language: Language;
  mode: number;
  board_index: number;
  solution?: string;
  solution_normalized?: string;
  solution_display?: string;
};

type PuzzlesFile = {
  puzzles: PuzzleRow[];
};

const DEFAULT_BASE_URL = "https://pt.wiktionary.org/w/api.php";
const DEFAULT_DELAY_MS = 250;
const DEFAULT_CONCURRENCY = 2;
const VALID_POS_HEADINGS = new Set([
  "substantivo",
  "adjetivo",
  "verbo",
  "advérbio",
  "adverbio",
  "pronome",
  "preposição",
  "preposicao",
  "interjeição",
  "interjeicao",
  "numeral",
  "artigo",
  "locução",
  "locucao",
  "nome próprio",
  "nome proprio",
  "sigla",
]);

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

const toNumberArg = (flag: string, fallback: number) => {
  const value = Number(getArgValue(flag) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeWord = (value: string) =>
  value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const parseWordLengths = (value: string | null) => {
  if (!value) {
    return null;
  }

  const lengths = value
    .split(",")
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((entry) => Number.isFinite(entry) && entry > 0);

  return lengths.length ? [...new Set(lengths)] : null;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const formatUnknownError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
};

const cleanDefinition = (value: string | null) => {
  if (!value) {
    return null;
  }

  const cleaned = normalizeWhitespace(value.replace(/\r\n?/g, "\n"));
  return cleaned || null;
};

const isMetadataLine = (line: string, normalizedWord: string) => {
  const normalizedLine = normalizeWord(line);

  if (!normalizedLine) {
    return true;
  }

  if (normalizedLine === normalizedWord) {
    return true;
  }

  if (
    /^(afi:|masculino|feminino|plural|singular|transitivo|intransitivo|pronominal|coletivo|comparativo|superlativo)\b/i.test(
      normalizedLine,
    )
  ) {
    return true;
  }

  if (
    /^[a-zà-ÿ.\s-]+,\s*(masculino|feminino|plural|singular|transitivo|intransitivo)\b/i.test(
      line,
    )
  ) {
    return true;
  }

  return false;
};

const extractPortugueseDefinition = (extract: string, displayWord: string) => {
  const normalizedTarget = normalizeWord(displayWord);
  const lines = extract.replace(/\r\n?/g, "\n").split("\n");
  const portugueseLines: string[] = [];
  let inPortugueseSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^=\s*português\s*=$/i.test(line)) {
      inPortugueseSection = true;
      continue;
    }

    if (inPortugueseSection && /^=\s*[^=].*[^=]\s*=$/.test(line)) {
      break;
    }

    if (inPortugueseSection) {
      portugueseLines.push(line);
    }
  }

  if (!portugueseLines.length) {
    return null;
  }

  let inValidPosSection = false;

  for (const line of portugueseLines) {
    if (!line) {
      continue;
    }

    const posMatch = line.match(/^==\s*(.+?)\s*==$/);
    if (posMatch) {
      const sectionName = normalizeWord(posMatch[1] ?? "");
      inValidPosSection = VALID_POS_HEADINGS.has(sectionName);
      continue;
    }

    if (/^===.+===$/.test(line)) {
      continue;
    }

    if (!inValidPosSection || /^=+.+?=+$/.test(line)) {
      continue;
    }

    if (isMetadataLine(line, normalizedTarget)) {
      continue;
    }

    return cleanDefinition(line);
  }

  return null;
};

const fetchWordDefinition = async ({
  baseUrl,
  query,
  timeoutMs,
}: {
  baseUrl: string;
  query: string;
  timeoutMs: number;
}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("prop", "extracts");
    url.searchParams.set("explaintext", "1");
    url.searchParams.set("titles", query);

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "LetrixDefinitionRefresh/1.0 (Wiktionary import script)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      query?: { pages?: Array<{ missing?: boolean; extract?: string }> };
    };

    const page = payload.query?.pages?.[0];

    if (!page || page.missing || !page.extract) {
      return null;
    }

    return extractPortugueseDefinition(page.extract, query);
  } finally {
    clearTimeout(timeout);
  }
};

const resolveDefinitionQueries = (row: WordRow) => {
  const candidates = [
    row.display_word.trim(),
    row.word.trim(),
    normalizeWord(row.display_word),
  ].filter(Boolean);

  return [...new Set(candidates)];
};

const run = async () => {
  const cwd = process.cwd();
  const repoRoot = fs.existsSync(path.resolve(cwd, "supabase"))
    ? cwd
    : path.resolve(cwd, "../..");

  const baseUrl = getArgValue("--base-url") ?? DEFAULT_BASE_URL;
  const inPath = path.resolve(
    repoRoot,
    getArgValue("--in") ?? "supabase/data/words.json",
  );
  const outPath = path.resolve(repoRoot, getArgValue("--out") ?? inPath);
  const delayMs = Math.max(0, toNumberArg("--delay-ms", DEFAULT_DELAY_MS));
  const timeoutMs = Math.max(1000, toNumberArg("--timeout-ms", 12000));
  const concurrency = Math.max(
    1,
    toNumberArg("--concurrency", DEFAULT_CONCURRENCY),
  );
  const limit = Math.max(0, toNumberArg("--limit", 0));
  const startAt = Math.max(0, toNumberArg("--start-at", 0));
  const onlyMissing = !hasFlag("--force");
  const isDryRun = hasFlag("--dry-run");
  const solutionsOnly = hasFlag("--solutions-only");
  const lengthsFilter = parseWordLengths(getArgValue("--word-lengths"));
  const language = (getArgValue("--language") ?? "pt") as Language;
  const fromPuzzlesDays = Math.max(0, toNumberArg("--from-puzzles-days", 0));
  const fromPuzzlesStartDate = getArgValue("--from-puzzles-start-date");
  const puzzlesPath = path.resolve(
    repoRoot,
    getArgValue("--puzzles") ?? "supabase/data/puzzles.json",
  );

  if (language !== "pt") {
    throw new Error(
      "This script currently supports only --language pt via pt.wiktionary.org.",
    );
  }

  if (!fs.existsSync(inPath)) {
    throw new Error(`Input file not found: ${inPath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(inPath, "utf8")) as WordsFile;
  const words = Array.isArray(parsed.words) ? parsed.words : [];
  let allowedPuzzleWords: Set<string> | null = null;

  if (fromPuzzlesDays > 0) {
    if (!fs.existsSync(puzzlesPath)) {
      throw new Error(`Puzzles file not found: ${puzzlesPath}`);
    }

    const puzzlesPayload = JSON.parse(
      fs.readFileSync(puzzlesPath, "utf8"),
    ) as PuzzlesFile;
    const puzzles = Array.isArray(puzzlesPayload.puzzles)
      ? puzzlesPayload.puzzles
      : [];
    const startDate = new Date(
      `${fromPuzzlesStartDate ?? toIsoDate(new Date())}T00:00:00.000Z`,
    );

    if (Number.isNaN(startDate.valueOf())) {
      throw new Error(
        "Invalid --from-puzzles-start-date. Use YYYY-MM-DD format.",
      );
    }

    const endDate = addDays(startDate, fromPuzzlesDays - 1);
    const startLabel = toIsoDate(startDate);
    const endLabel = toIsoDate(endDate);

    allowedPuzzleWords = new Set(
      puzzles
        .filter(
          (row) =>
            row.language === language &&
            row.puzzle_date >= startLabel &&
            row.puzzle_date <= endLabel,
        )
        .map((row) =>
          normalizeWord(
            row.solution_normalized ??
              row.solution ??
              row.solution_display ??
              "",
          ),
        )
        .filter(Boolean),
    );
  }

  const filtered = words.filter((row) => {
    if (row.language !== language) {
      return false;
    }

    if (solutionsOnly && !row.is_solution) {
      return false;
    }

    if (lengthsFilter && !lengthsFilter.includes(row.word_length)) {
      return false;
    }

    if (
      allowedPuzzleWords &&
      !allowedPuzzleWords.has(normalizeWord(row.word))
    ) {
      return false;
    }

    if (onlyMissing && row.definition?.trim()) {
      return false;
    }

    return true;
  });

  const targetRows =
    limit > 0
      ? filtered.slice(startAt, startAt + limit)
      : filtered.slice(startAt);

  console.log(`Source file: ${inPath}`);
  console.log(`Output file: ${outPath}`);
  console.log(`Candidates: ${filtered.length}`);
  console.log(`Selected: ${targetRows.length}`);
  console.log(`Mode: ${isDryRun ? "dry-run" : "write"}`);

  if (!targetRows.length) {
    return;
  }

  let processed = 0;
  let updated = 0;
  let failed = 0;
  let missing = 0;

  const queue = [...targetRows];
  const runWorker = async () => {
    while (queue.length > 0) {
      const row = queue.shift();

      if (!row) {
        return;
      }

      processed += 1;

      try {
        let definition: string | null = null;

        for (const query of resolveDefinitionQueries(row)) {
          definition = await fetchWordDefinition({
            baseUrl,
            query,
            timeoutMs,
          });

          if (definition) {
            break;
          }
        }

        if (definition) {
          row.definition = definition;
          updated += 1;
          console.log(
            `[${processed}/${targetRows.length}] updated ${row.display_word}`,
          );
        } else {
          missing += 1;
          console.log(
            `[${processed}/${targetRows.length}] missing ${row.display_word}`,
          );
        }
      } catch (error) {
        failed += 1;
        console.warn(
          `[${processed}/${targetRows.length}] failed ${row.display_word}: ${formatUnknownError(error)}`,
        );
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));

  if (!isDryRun) {
    fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2) + "\n");
  }

  console.log("Summary:");
  console.log(`- updated: ${updated}`);
  console.log(`- missing: ${missing}`);
  console.log(`- failed: ${failed}`);
};

run().catch((error) => {
  console.error(formatUnknownError(error));
  process.exit(1);
});
