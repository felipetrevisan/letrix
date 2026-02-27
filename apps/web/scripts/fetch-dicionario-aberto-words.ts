import fs from "node:fs";
import path from "node:path";

type WordLength = 5 | 10;

type CrawlResult = {
  generated_at: string;
  source: string;
  note: string;
  lengths: WordLength[];
  prefix_length: number;
  letters: string;
  total_prefixes: number;
  total_requests: number;
  failed_requests: number;
  error_responses: number;
  empty_responses: number;
  total_unique_words: number;
  words_by_length: Record<WordLength, string[]>;
  sample_errors: string[];
};

type SupabaseWordRow = {
  language: "pt";
  word: string;
  display_word: string;
  word_length: number;
  is_solution: boolean;
  is_active: boolean;
};

const DEFAULT_BASE_URL = "https://api.dicionario-aberto.net";
const DEFAULT_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const DEFAULT_PREFIX_LENGTH = 3;

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

const toNumberArg = (flag: string, fallback: number) => {
  const value = Number(getArgValue(flag) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseLengths = (value: string | null): WordLength[] => {
  const parsed = (value ?? "5,10")
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry): entry is WordLength => entry === 5 || entry === 10);

  return parsed.length ? [...new Set(parsed)] : [5, 10];
};

const normalizeDisplay = (value: string) =>
  value.normalize("NFC").trim().toLowerCase();

const normalizeForCompare = (value: string) =>
  normalizeDisplay(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const countLetters = (value: string) =>
  Array.from(value.normalize("NFC")).filter((character) =>
    /\p{Letter}/u.test(character),
  ).length;

const extractWordsFromPayload = (payload: unknown) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const words = new Set<string>();

  for (const item of payload) {
    if (typeof item === "string") {
      words.add(item);
      continue;
    }

    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = (item as Record<string, unknown>).word;
    if (typeof candidate === "string") {
      words.add(candidate);
    }
  }

  return [...words];
};

const generatePrefixes = (letters: string, prefixLength: number) => {
  let prefixes = [""];

  for (let depth = 0; depth < prefixLength; depth += 1) {
    const next: string[] = [];
    for (const base of prefixes) {
      for (const letter of letters) {
        next.push(`${base}${letter}`);
      }
    }
    prefixes = next;
  }

  return prefixes;
};

const fetchPrefix = async ({
  baseUrl,
  prefix,
  retries,
  timeoutMs,
}: {
  baseUrl: string;
  prefix: string;
  retries: number;
  timeoutMs: number;
}) => {
  const url = `${baseUrl.replace(/\/$/, "")}/prefix/${encodeURIComponent(prefix)}`;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = (await response.text()).slice(0, 220).replace(/\s+/g, " ");
        return {
          words: [] as string[],
          failed: true,
          errorResponse: false,
          error: `HTTP ${response.status} (${prefix}) ${body}`,
        };
      }

      const body = await response.text();
      let payload: unknown = null;

      try {
        payload = JSON.parse(body);
      } catch {
        return {
          words: [] as string[],
          failed: true,
          errorResponse: false,
          error: `Invalid JSON (${prefix})`,
        };
      }

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const record = payload as Record<string, unknown>;
        if (record.status === "error" || typeof record.error === "string") {
          return {
            words: [] as string[],
            failed: false,
            errorResponse: true,
            error: `API error (${prefix}) ${String(record.error ?? "unknown")}`,
          };
        }
      }

      return {
        words: extractWordsFromPayload(payload),
        failed: false,
        errorResponse: false,
        error: null as string | null,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < retries) {
        await sleep(220 * attempt);
        continue;
      }
      return {
        words: [] as string[],
        failed: true,
        errorResponse: false,
        error: `Request failed (${prefix}) ${lastError}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    words: [] as string[],
    failed: true,
    errorResponse: false,
    error: `Request failed (${prefix}) ${lastError ?? "unknown error"}`,
  };
};

const run = async () => {
  const cwd = process.cwd();
  const repoRoot = fs.existsSync(path.resolve(cwd, "supabase"))
    ? cwd
    : path.resolve(cwd, "../..");

  const baseUrl = getArgValue("--base-url") ?? DEFAULT_BASE_URL;
  const lengths = parseLengths(getArgValue("--lengths"));
  const lettersRaw = (
    getArgValue("--letters") ?? DEFAULT_LETTERS
  ).toLowerCase();
  const letters = [
    ...new Set(
      lettersRaw.split("").filter((character) => /[a-z]/.test(character)),
    ),
  ].join("");
  const prefixLength = Math.max(
    3,
    toNumberArg("--prefix-length", DEFAULT_PREFIX_LENGTH),
  );
  const retries = Math.max(1, toNumberArg("--retries", 3));
  const timeoutMs = Math.max(1000, toNumberArg("--timeout-ms", 12000));
  const delayMs = Math.max(0, toNumberArg("--delay-ms", 0));
  const concurrency = Math.max(1, toNumberArg("--concurrency", 8));
  const outPath = path.resolve(
    repoRoot,
    getArgValue("--out") ?? "supabase/data/dicionario-aberto-5-10.json",
  );
  const supabaseOutArg = getArgValue("--supabase-out");
  const supabaseOutPath = supabaseOutArg
    ? path.resolve(repoRoot, supabaseOutArg)
    : null;
  const probePrefix = getArgValue("--probe-prefix");

  if (!letters.length) {
    throw new Error("No valid letters provided.");
  }

  if (probePrefix) {
    const probe = await fetchPrefix({
      baseUrl,
      prefix: probePrefix.toLowerCase(),
      retries,
      timeoutMs,
    });

    console.log(
      JSON.stringify(
        {
          prefix: probePrefix.toLowerCase(),
          words_count: probe.words.length,
          failed: probe.failed,
          error_response: probe.errorResponse,
          error: probe.error,
          sample: probe.words.slice(0, 25),
        },
        null,
        2,
      ),
    );
    return;
  }

  const prefixes = generatePrefixes(letters, prefixLength);
  const prefixesByLeadingLetter = new Map<string, string[]>();

  for (const prefix of prefixes) {
    const lead = prefix[0] ?? "";
    if (!prefixesByLeadingLetter.has(lead)) {
      prefixesByLeadingLetter.set(lead, []);
    }
    prefixesByLeadingLetter.get(lead)?.push(prefix);
  }

  const wordsByLength = new Map<WordLength, Set<string>>();
  for (const length of lengths) {
    wordsByLength.set(length, new Set<string>());
  }

  const displayByNormalized = new Map<string, string>();
  const sampleErrors: string[] = [];

  let totalRequests = 0;
  let failedRequests = 0;
  let errorResponses = 0;
  let emptyResponses = 0;
  let processed = 0;

  const processBatch = async (batch: string[], label: string) => {
    const queue = [...batch];
    let batchProcessed = 0;

    const workers = Array.from(
      { length: Math.min(concurrency, batch.length) },
      async () => {
        while (true) {
          const prefix = queue.shift();
          if (!prefix) {
            break;
          }

          const result = await fetchPrefix({
            baseUrl,
            prefix,
            retries,
            timeoutMs,
          });

          processed += 1;
          batchProcessed += 1;
          totalRequests += 1;

          if (result.failed) {
            failedRequests += 1;
            if (result.error && sampleErrors.length < 30) {
              sampleErrors.push(result.error);
            }
          }

          if (result.errorResponse) {
            errorResponses += 1;
            if (result.error && sampleErrors.length < 30) {
              sampleErrors.push(result.error);
            }
          }

          if (!result.words.length) {
            emptyResponses += 1;
          }

          const normalizedPrefix = normalizeForCompare(prefix);

          for (const wordRaw of result.words) {
            const displayWord = normalizeDisplay(wordRaw);
            if (!displayWord) {
              continue;
            }

            const normalizedWord = normalizeForCompare(displayWord);
            if (!normalizedWord.startsWith(normalizedPrefix)) {
              continue;
            }

            const length = countLetters(displayWord);
            if (length !== 5 && length !== 10) {
              continue;
            }

            const targetSet = wordsByLength.get(length);
            if (!targetSet) {
              continue;
            }

            targetSet.add(displayWord);

            const existingDisplay = displayByNormalized.get(normalizedWord);
            if (!existingDisplay) {
              displayByNormalized.set(normalizedWord, displayWord);
            } else {
              const existingHasAccents =
                normalizeForCompare(existingDisplay) !== existingDisplay;
              const currentHasAccents =
                normalizeForCompare(displayWord) !== displayWord;
              if (!existingHasAccents && currentHasAccents) {
                displayByNormalized.set(normalizedWord, displayWord);
              }
            }
          }

          if (processed % 400 === 0 || batchProcessed % 200 === 0) {
            const uniqueNow = new Set(
              lengths.flatMap((length) => [
                ...(wordsByLength.get(length) ?? new Set<string>()),
              ]),
            ).size;
            console.log(
              `[${label}] progress ${batchProcessed}/${batch.length} | total ${processed}/${prefixes.length} | unique=${uniqueNow}`,
            );
          }

          if (delayMs > 0) {
            await sleep(delayMs);
          }
        }
      },
    );

    await Promise.all(workers);
  };

  for (const lead of letters.split("")) {
    const batch = prefixesByLeadingLetter.get(lead) ?? [];
    if (!batch.length) {
      continue;
    }

    console.log(`[${lead.toUpperCase()}] starting ${batch.length} prefixes`);
    await processBatch(batch, lead.toUpperCase());
    console.log(`[${lead.toUpperCase()}] finished`);
  }

  const wordsByLengthRecord = Object.fromEntries(
    lengths.map((length) => [
      length,
      [...(wordsByLength.get(length) ?? new Set<string>())].sort(),
    ]),
  ) as Record<WordLength, string[]>;

  const totalUniqueWords = new Set(
    lengths.flatMap((length) => wordsByLengthRecord[length]),
  ).size;

  const result: CrawlResult = {
    generated_at: new Date().toISOString(),
    source: baseUrl,
    note: "Coleta via /prefix com varredura de prefixos fixos (default: 3 letras).",
    lengths,
    prefix_length: prefixLength,
    letters,
    total_prefixes: prefixes.length,
    total_requests: totalRequests,
    failed_requests: failedRequests,
    error_responses: errorResponses,
    empty_responses: emptyResponses,
    total_unique_words: totalUniqueWords,
    words_by_length: wordsByLengthRecord,
    sample_errors: sampleErrors,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`Saved crawl result: ${outPath}`);
  console.log(`Unique words (5/10): ${totalUniqueWords}`);

  if (!supabaseOutPath) {
    return;
  }

  const supabaseRowsMap = new Map<string, SupabaseWordRow>();

  for (const length of lengths) {
    for (const displayWord of wordsByLengthRecord[length]) {
      const normalizedWord = normalizeForCompare(displayWord);
      if (!normalizedWord) {
        continue;
      }

      supabaseRowsMap.set(normalizedWord, {
        language: "pt",
        word: normalizedWord,
        display_word: displayByNormalized.get(normalizedWord) ?? displayWord,
        word_length: length,
        is_solution: true,
        is_active: true,
      });
    }
  }

  const supabaseRows = [...supabaseRowsMap.values()].sort((left, right) => {
    if (left.word_length !== right.word_length) {
      return left.word_length - right.word_length;
    }
    return left.word.localeCompare(right.word);
  });

  fs.mkdirSync(path.dirname(supabaseOutPath), { recursive: true });
  fs.writeFileSync(
    supabaseOutPath,
    `${JSON.stringify({ words: supabaseRows }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Saved Supabase words output: ${supabaseOutPath}`);
  console.log(`Supabase rows: ${supabaseRows.length}`);
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Failed to crawl dicionario-aberto /prefix:", message);
  process.exit(1);
});
