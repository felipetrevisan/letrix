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

const DEFAULT_BASE_URL = "https://api.dicionario-aberto.net";
const DEFAULT_DELAY_MS = 250;
const DEFAULT_CONCURRENCY = 3;

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

const stripTags = (value: string) => value.replace(/<[^>]+>/g, " ");

const decodeXmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );

const cleanDefinition = (value: string | null) => {
  if (!value) {
    return null;
  }

  const cleaned = normalizeWhitespace(decodeXmlEntities(stripTags(value)));
  return cleaned || null;
};

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
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/word/${encodeURIComponent(query)}`,
      {
        headers: {
          accept: "application/xml,text/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return null;
    }

    const xml = await response.text();
    const matches = [...xml.matchAll(/<def[^>]*>([\s\S]*?)<\/def>/gi)];

    if (!matches.length) {
      return null;
    }

    for (const match of matches) {
      const definition = cleanDefinition(match[1] ?? null);

      if (definition) {
        return definition;
      }
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchPrefixPreview = async ({
  baseUrl,
  query,
  timeoutMs,
}: {
  baseUrl: string;
  query: string;
  timeoutMs: number;
}) => {
  const prefix = normalizeWord(query).slice(0, 3);

  if (prefix.length < 3) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/prefix/${encodeURIComponent(prefix)}`,
      {
        headers: {
          accept: "application/json",
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;

    if (!Array.isArray(payload)) {
      return null;
    }

    const normalizedQuery = normalizeWord(query);

    for (const item of payload) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const record = item as Record<string, unknown>;
      const candidateWord =
        typeof record.word === "string" ? normalizeWord(record.word) : null;

      if (candidateWord !== normalizedQuery) {
        continue;
      }

      const previewKeys = ["preview", "definition", "def", "excerpt"];

      for (const key of previewKeys) {
        const candidatePreview = record[key];
        if (typeof candidatePreview === "string") {
          const cleaned = cleanDefinition(candidatePreview);
          if (cleaned) {
            return cleaned;
          }
        }
      }
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
};

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
  const languageArg = getArgValue("--language");
  const language =
    languageArg === "pt" || languageArg === "en" ? languageArg : null;

  const content = fs.readFileSync(inPath, "utf8");
  const parsed = JSON.parse(content) as WordsFile;
  const words = parsed.words ?? [];

  const targetIndexes = words
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => (language ? row.language === language : true))
    .filter(({ row }) =>
      lengthsFilter ? lengthsFilter.includes(row.word_length) : true,
    )
    .filter(({ row }) => (solutionsOnly ? row.is_solution : true))
    .filter(({ row }) =>
      onlyMissing ? !row.definition || !row.definition.trim() : true,
    )
    .slice(startAt, limit > 0 ? startAt + limit : undefined);

  console.log(`Input: ${inPath}`);
  console.log(`Output: ${outPath}`);
  console.log(
    `Selected rows: ${targetIndexes.length} | language=${language ?? "all"} | lengths=${lengthsFilter?.join(",") ?? "all"} | solutionsOnly=${solutionsOnly} | onlyMissing=${onlyMissing} | dryRun=${isDryRun}`,
  );

  if (isDryRun) {
    for (const { row, index } of targetIndexes.slice(0, 50)) {
      console.log(
        `[preview] #${index} ${row.language} ${row.word_length} ${row.word} -> ${row.display_word}`,
      );
    }
    return;
  }

  const queue = [...targetIndexes];
  let processed = 0;
  let updated = 0;
  let missing = 0;
  let failed = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, targetIndexes.length || 1) },
    async () => {
      while (true) {
        const next = queue.shift();

        if (!next) {
          break;
        }

        const { row, index } = next;
        processed += 1;

        try {
          const definition =
            (await fetchWordDefinition({
              baseUrl,
              query: row.display_word || row.word,
              timeoutMs,
            })) ??
            (await fetchWordDefinition({
              baseUrl,
              query: row.word,
              timeoutMs,
            })) ??
            (await fetchPrefixPreview({
              baseUrl,
              query: row.display_word || row.word,
              timeoutMs,
            }));

          if (definition) {
            words[index] = {
              ...row,
              definition,
            };
            updated += 1;
            console.log(
              `[${processed}/${targetIndexes.length}] updated ${row.word} -> ${definition.slice(0, 96)}`,
            );
          } else {
            missing += 1;
            console.log(
              `[${processed}/${targetIndexes.length}] no-definition ${row.word}`,
            );
          }
        } catch (error) {
          failed += 1;
          console.log(
            `[${processed}/${targetIndexes.length}] failed ${row.word} -> ${formatUnknownError(error)}`,
          );
        }

        if (delayMs > 0) {
          await sleep(delayMs);
        }
      }
    },
  );

  await Promise.all(workers);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify({ words }, null, 2)}\n`, "utf8");

  console.log(
    `Finished: processed=${processed} updated=${updated} missing=${missing} failed=${failed}`,
  );
};

run().catch((error) => {
  console.error(
    "Failed to refresh dicionario definitions:",
    formatUnknownError(error),
  );
  process.exit(1);
});
