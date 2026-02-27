import fs from "node:fs";
import path from "node:path";

type WordLength = 5 | 10;

type PapalavrasWord = {
  id: number;
  word: string;
  count: number;
  character: string;
};

type CrawlResult = {
  generated_at: string;
  source: string;
  note: string;
  lengths: WordLength[];
  letters: string[];
  total_requests: number;
  failed_requests: number;
  unique_words: number;
  words_by_length: Record<WordLength, string[]>;
  per_letter: Array<{
    letter: string;
    requests: number;
    failures: number;
    new_words: number;
    stopped_by: "max_requests" | "stale_limit";
  }>;
};

type SupabaseWordRow = {
  language: "pt";
  word: string;
  display_word: string;
  word_length: number;
  is_solution: boolean;
  is_active: boolean;
};

type FetchWordResult = {
  row: PapalavrasWord | null;
  error: string | null;
};

const DEFAULT_BASE_URL = "http://papalavras-server.herokuapp.com";
const DEFAULT_LENGTHS = "5,10";
const DEFAULT_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

const normalizeDisplay = (value: string) =>
  value.normalize("NFC").trim().toLowerCase();

const normalizeForCompare = (value: string) =>
  normalizeDisplay(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const parseLengths = (value: string | null): WordLength[] => {
  const parsed = (value ?? DEFAULT_LENGTHS)
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry): entry is WordLength => entry === 5 || entry === 10);

  return parsed.length ? [...new Set(parsed)] : [5, 10];
};

const parseLetters = (value: string | null): string[] => {
  const input = value ?? DEFAULT_LETTERS;
  const letters = input
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => /^[A-ZÀ-ÚÇ]$/u.test(entry));

  if (!letters.length) {
    return DEFAULT_LETTERS.split("");
  }

  return [...new Set(letters)];
};

const parseJsonish = (text: string): unknown => {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return null;
    }

    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
};

const normalizeBaseUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, "");

  const markers = ["/words/random/", "/words/random", "/words/verify/"];
  for (const marker of markers) {
    const index = trimmed.toLowerCase().indexOf(marker);
    if (index > 0) {
      return trimmed.slice(0, index);
    }
  }

  return trimmed;
};

const isPapalavrasWord = (value: unknown): value is PapalavrasWord => {
  if (typeof value !== "object" || value == null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.word === "string" &&
    typeof record.count === "number" &&
    typeof record.character === "string"
  );
};

const fetchRandomWord = async ({
  baseUrl,
  letter,
  retries,
  timeoutMs,
}: {
  baseUrl: string;
  letter: string;
  retries: number;
  timeoutMs: number;
}): Promise<FetchWordResult> => {
  const url = `${baseUrl.replace(/\/$/, "")}/words/random/${encodeURIComponent(letter)}`;
  let lastErrorMessage: string | null = null;

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
        const body = (await response.text()).slice(0, 180).replace(/\s+/g, " ");
        throw new Error(`HTTP ${response.status} - ${body}`);
      }

      const bodyText = await response.text();
      const payload = parseJsonish(bodyText);

      if (isPapalavrasWord(payload)) {
        return { row: payload, error: null };
      }

      return {
        row: null,
        error: "Invalid payload format (not PapalavrasWord)",
      };
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      if (attempt === retries) {
        return {
          row: null,
          error: `Request failed after ${retries} attempts for ${url}. ${lastErrorMessage}`,
        };
      }

      await sleep(250 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    row: null,
    error: `Request failed for ${url}. ${lastErrorMessage ?? "unknown error"}`,
  };
};

const run = async () => {
  const cwd = process.cwd();
  const repoRoot = fs.existsSync(path.resolve(cwd, "supabase"))
    ? cwd
    : path.resolve(cwd, "../..");

  const baseUrl = getArgValue("--base-url") ?? DEFAULT_BASE_URL;
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const lengths = parseLengths(getArgValue("--lengths"));
  const letters = parseLetters(getArgValue("--letters"));
  const outPath = path.resolve(
    repoRoot,
    getArgValue("--out") ?? "supabase/data/papalavras-5-10.json",
  );
  const supabaseOutArg = getArgValue("--supabase-out");
  const supabaseOutPath = supabaseOutArg
    ? path.resolve(repoRoot, supabaseOutArg)
    : null;

  const maxRequestsPerLetter = Math.max(
    1,
    toNumberArg("--max-requests-per-letter", 3000),
  );
  const maxStalePerLetter = Math.max(
    1,
    toNumberArg("--max-stale-per-letter", 600),
  );
  const retries = Math.max(1, toNumberArg("--retries", 3));
  const timeoutMs = Math.max(1000, toNumberArg("--timeout-ms", 10000));
  const delayMs = Math.max(0, toNumberArg("--delay-ms", 20));
  const concurrency = Math.max(1, toNumberArg("--concurrency", 2));

  const wordsByLength = new Map<WordLength, Set<string>>();
  for (const length of lengths) {
    wordsByLength.set(length, new Set<string>());
  }

  const displayByNormalized = new Map<string, string>();
  const queue = [...letters];

  let totalRequests = 0;
  let failedRequests = 0;
  const perLetter: CrawlResult["per_letter"] = [];
  let firstFailureDetail: string | null = null;

  const preflight = await fetchRandomWord({
    baseUrl: normalizedBaseUrl,
    letter: letters[0] ?? "A",
    retries,
    timeoutMs,
  });

  if (!preflight.row) {
    throw new Error(
      `Preflight failed for base URL '${normalizedBaseUrl}'. Detail: ${preflight.error ?? "unknown error"}`,
    );
  }

  const workers = Array.from(
    { length: Math.min(concurrency, letters.length) },
    async () => {
      while (true) {
        const letter = queue.shift();
        if (!letter) {
          break;
        }

        let requests = 0;
        let failures = 0;
        let stale = 0;
        let newWords = 0;
        let stoppedBy: "max_requests" | "stale_limit" = "max_requests";

        while (requests < maxRequestsPerLetter) {
          const row = await fetchRandomWord({
            baseUrl: normalizedBaseUrl,
            letter,
            retries,
            timeoutMs,
          });

          totalRequests += 1;
          requests += 1;

          if (!row.row) {
            failedRequests += 1;
            failures += 1;
            stale += 1;
            if (!firstFailureDetail && row.error) {
              firstFailureDetail = row.error;
            }
          } else {
            const displayWord = normalizeDisplay(row.row.word);
            const normalizedWord = normalizeForCompare(displayWord);
            const isTargetLength = lengths.includes(
              row.row.count as WordLength,
            );

            if (normalizedWord && isTargetLength) {
              const targetSet = wordsByLength.get(row.row.count as WordLength);
              if (targetSet && !targetSet.has(displayWord)) {
                targetSet.add(displayWord);
                newWords += 1;
                stale = 0;

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
              } else {
                stale += 1;
              }
            } else {
              stale += 1;
            }
          }

          if (stale >= maxStalePerLetter) {
            stoppedBy = "stale_limit";
            break;
          }

          if (delayMs > 0) {
            await sleep(delayMs);
          }
        }

        perLetter.push({
          letter,
          requests,
          failures,
          new_words: newWords,
          stopped_by: stoppedBy,
        });

        console.log(
          `[${letter}] requests=${requests} new=${newWords} failures=${failures} stop=${stoppedBy}`,
        );
      }
    },
  );

  await Promise.all(workers);

  const wordsByLengthRecord = Object.fromEntries(
    lengths.map((length) => [
      length,
      [...(wordsByLength.get(length) ?? new Set<string>())].sort(),
    ]),
  ) as Record<WordLength, string[]>;

  const uniqueWords = new Set(
    lengths.flatMap((length) => wordsByLengthRecord[length]),
  ).size;

  const result: CrawlResult = {
    generated_at: new Date().toISOString(),
    source: baseUrl,
    note: "Amostragem por endpoint random. Não garante cobertura total do dicionário.",
    lengths,
    letters,
    total_requests: totalRequests,
    failed_requests: failedRequests,
    unique_words: uniqueWords,
    words_by_length: wordsByLengthRecord,
    per_letter: perLetter.sort((a, b) => a.letter.localeCompare(b.letter)),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`Saved crawl result: ${outPath}`);
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Unique words (5/10): ${uniqueWords}`);
  if (firstFailureDetail) {
    console.log(`First failure detail: ${firstFailureDetail}`);
  }

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
  console.error("Failed to crawl papalavras-server:", message);
  process.exit(1);
});
