import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_GEMINI_MODEL,
  type DefinitionLanguage,
  generateDefinitionWithGemini,
} from "../src/features/game/lib/gemini-definition";

type WordDefinitionRow = {
  language: DefinitionLanguage;
  normalized_word: string;
  display_word: string;
  word_length: number;
  definition: string | null;
  definition_status: "pending" | "ready" | "failed" | null;
};

const LETRIX_SCHEMA = "letrix";
const DEFAULT_LIMIT = 50;
const DEFAULT_DELAY_MS = 250;

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

const parsePositiveInteger = (
  value: string | null,
  fallback: number,
  label: string,
) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return parsed;
};

const validateLanguage = (
  language: string | null,
): language is DefinitionLanguage => {
  return language === "pt" || language === "en";
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

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

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  (process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID
    ? `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co`
    : undefined);
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "Missing env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PROJECT_ID) and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey).schema(
  LETRIX_SCHEMA,
);

const run = async () => {
  const languageArg = getArgValue("--language");
  const language = validateLanguage(languageArg) ? languageArg : null;
  const wordLengthArg = getArgValue("--word-length");
  const wordLength = wordLengthArg ? Number.parseInt(wordLengthArg, 10) : null;
  const limit = parsePositiveInteger(
    getArgValue("--limit"),
    DEFAULT_LIMIT,
    "limit",
  );
  const delayMs = parsePositiveInteger(
    getArgValue("--delay-ms"),
    DEFAULT_DELAY_MS,
    "delay-ms",
  );
  const isDryRun = hasFlag("--dry-run");
  const includeFailed = hasFlag("--include-failed");
  const force = hasFlag("--force");
  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;

  if (languageArg && !language) {
    throw new Error(`Invalid language: ${languageArg}. Use pt or en.`);
  }

  if (wordLengthArg && (!Number.isFinite(wordLength) || wordLength === null)) {
    throw new Error(`Invalid word length: ${wordLengthArg}`);
  }

  let query = (supabase.from("words") as any)
    .select(
      "language, normalized_word, display_word, word_length, definition, definition_status",
    )
    .eq("is_active", true)
    .order("language", { ascending: true })
    .order("word_length", { ascending: true })
    .order("normalized_word", { ascending: true })
    .limit(limit);

  if (language) {
    query = query.eq("language", language);
  }

  if (wordLength !== null) {
    query = query.eq("word_length", wordLength);
  }

  if (!force) {
    query = includeFailed
      ? query.or(
          "definition.is.null,definition.eq.,definition_status.eq.failed",
        )
      : query.or("definition.is.null,definition.eq.");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load words: ${formatUnknownError(error)}`);
  }

  const rows = (data ?? []) as WordDefinitionRow[];

  console.log(
    `Mode: ${isDryRun ? "dry-run" : "write"} | model=${model} | limit=${limit} | delay=${delayMs}ms`,
  );
  console.log(
    `Filters: language=${language ?? "all"} | wordLength=${wordLength ?? "all"} | includeFailed=${includeFailed} | force=${force}`,
  );
  console.log(`Words selected: ${rows.length}`);

  if (isDryRun || rows.length === 0) {
    for (const row of rows) {
      console.log(
        `[preview] ${row.language} ${row.word_length} ${row.normalized_word} (${row.definition_status ?? "null"})`,
      );
    }
    return;
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const row of rows) {
    processed += 1;
    console.log(
      `[${processed}/${rows.length}] Generating definition for ${row.language}/${row.word_length}/${row.normalized_word}`,
    );

    try {
      await (supabase.from("words") as any)
        .update({
          definition_status: "pending",
          definition_updated_at: new Date().toISOString(),
        })
        .eq("language", row.language)
        .eq("word_length", row.word_length)
        .eq("normalized_word", row.normalized_word);

      const definition = await generateDefinitionWithGemini({
        language: row.language,
        displayWord: row.display_word,
        model,
      });

      const { error: updateError } = await (supabase.from("words") as any)
        .update({
          definition,
          definition_source: "ai",
          definition_status: "ready",
          definition_model: model,
          definition_generated_at: new Date().toISOString(),
          definition_updated_at: new Date().toISOString(),
        })
        .eq("language", row.language)
        .eq("word_length", row.word_length)
        .eq("normalized_word", row.normalized_word);

      if (updateError) {
        throw new Error(formatUnknownError(updateError));
      }

      succeeded += 1;
      console.log(`  ok -> ${definition}`);
    } catch (error) {
      failed += 1;

      await (supabase.from("words") as any)
        .update({
          definition_status: "failed",
          definition_updated_at: new Date().toISOString(),
        })
        .eq("language", row.language)
        .eq("word_length", row.word_length)
        .eq("normalized_word", row.normalized_word);

      console.log(`  fail -> ${formatUnknownError(error)}`);
    }

    if (delayMs > 0 && processed < rows.length) {
      await delay(delayMs);
    }
  }

  console.log(
    `Finished: processed=${processed} succeeded=${succeeded} failed=${failed}`,
  );
};

run().catch((error) => {
  console.error("Backfill failed:", formatUnknownError(error));
  process.exit(1);
});
