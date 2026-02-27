import {
  addDays,
  differenceInDays,
  formatISO,
  startOfDay,
  startOfToday,
} from "date-fns";
import { default as GraphemeSplitter } from "grapheme-splitter";
import { coreModeConfigs, parseCoreGameMode } from "@letrix/game-core";
import type { GameLanguage, Solution } from "@/interfaces/game";
import { getLetrixBrowserClient } from "@/features/auth/lib/supabase-client";

// 1 January 2024 Game Epoch
export const firstGameDate = new Date(2024, 0, 1);
export const periodInDays = 1;

const DEFAULT_LANGUAGE: GameLanguage = "pt";

type DailyPuzzleRow = {
  board_index: number;
  solution_normalized: string;
  solution_display: string;
};

type DictionaryWordRow = {
  normalized_word: string;
  display_word: string;
};

export const unicodeSplit = (word: string) => {
  return new GraphemeSplitter().splitGraphemes(localeAwareLowerCase(word));
};

export const unicodeLength = (word: string) => {
  return unicodeSplit(word).length;
};

export const localeAwareLowerCase = (text: string) => {
  return process.env.REACT_APP_LOCALE_STRING
    ? text?.toLocaleLowerCase(process.env.REACT_APP_LOCALE_STRING)
    : text?.toLowerCase();
};

export const localeAwareUpperCase = (text: string) => {
  return process.env.REACT_APP_LOCALE_STRING
    ? text?.toLocaleUpperCase(process.env.REACT_APP_LOCALE_STRING)
    : text?.toUpperCase();
};

export const normalizeWord = (value: string) => {
  return localeAwareLowerCase(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
};

export const resolveLanguageFromLocale = (locale?: string): GameLanguage => {
  const normalizedLocale = localeAwareLowerCase(locale ?? "");

  if (normalizedLocale.startsWith("en")) {
    return "en";
  }

  return DEFAULT_LANGUAGE;
};

export const isWordInWordList = async (
  word: string,
  language: GameLanguage,
  wordLength: number,
) => {
  const supabase = getLetrixBrowserClient();

  if (!supabase) {
    return false;
  }

  const normalizedWord = normalizeWord(word);

  const { count, error } = await supabase
    .from("words")
    .select("id", { count: "exact", head: true })
    .eq("language", language)
    .eq("word_length", wordLength)
    .eq("normalized_word", normalizedWord)
    .eq("is_active", true);

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
};

export const isWinningWord = (guess: string, solution: string) => {
  return normalizeWord(guess) === normalizeWord(solution);
};

export const isWinningMultipleWord = (guess: string, solution: string[]) => {
  const normalizedGuess = normalizeWord(guess);
  return solution.every((word) => normalizedGuess === normalizeWord(word));
};

export const findFirstUnusedReveal = () => {
  return false;
};

export const getDisplayWord = (word: string) => {
  return word;
};

export const getLastGameDate = (today: Date) => {
  const t = startOfDay(today);
  const daysSinceLastGame = differenceInDays(firstGameDate, t) % periodInDays;

  return addDays(t, -daysSinceLastGame);
};

export const getNextGameDate = (today: Date) => {
  return addDays(getLastGameDate(today), periodInDays);
};

export const isValidGameDate = (date: Date) => {
  if (date < firstGameDate || date > startOfToday()) {
    return false;
  }

  return differenceInDays(firstGameDate, date) % periodInDays === 0;
};

export const getIndex = (gameDate: Date) => {
  let start = firstGameDate;
  let index = -1;

  do {
    index += 1;
    start = addDays(start, periodInDays);
  } while (start <= gameDate);

  return index;
};

type ResolvedModeConfig = {
  boards: number;
  wordLength: number;
};

const hashString = (value: string) => {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const getFallbackRowsFromDictionary = async ({
  supabase,
  dateLabel,
  language,
  mode,
  boards,
  wordLength,
}: {
  supabase: ReturnType<typeof getLetrixBrowserClient>;
  dateLabel: string;
  language: GameLanguage;
  mode: number;
  boards: number;
  wordLength: number;
}): Promise<DailyPuzzleRow[]> => {
  if (!supabase) {
    return [];
  }

  const { count, error: countError } = await supabase
    .from("words")
    .select("id", { count: "exact", head: true })
    .eq("language", language)
    .eq("word_length", wordLength)
    .eq("is_solution", true)
    .eq("is_active", true);

  const totalWords = count ?? 0;

  if (countError || totalWords < boards) {
    return [];
  }

  const usedOffsets = new Set<number>();
  const fallbackRows: DailyPuzzleRow[] = [];

  for (let boardIndex = 0; boardIndex < boards; boardIndex += 1) {
    let offset =
      hashString(`${dateLabel}:${language}:${mode}:${boardIndex}`) % totalWords;
    let attempts = 0;

    while (usedOffsets.has(offset) && attempts < totalWords) {
      offset = (offset + 1) % totalWords;
      attempts += 1;
    }

    usedOffsets.add(offset);

    const { data, error } = await supabase
      .from("words")
      .select("normalized_word, display_word")
      .eq("language", language)
      .eq("word_length", wordLength)
      .eq("is_solution", true)
      .eq("is_active", true)
      .order("normalized_word", { ascending: true })
      .range(offset, offset)
      .maybeSingle();

    const row = data as DictionaryWordRow | null;

    if (error || !row) {
      return [];
    }

    fallbackRows.push({
      board_index: boardIndex,
      solution_normalized: row.normalized_word,
      solution_display: row.display_word,
    });
  }

  return fallbackRows;
};

const getResolvedModeConfig = (modeOrBoards: number): ResolvedModeConfig => {
  const parsedMode = parseCoreGameMode(modeOrBoards);

  if (parsedMode) {
    return {
      boards: coreModeConfigs[parsedMode].boards,
      wordLength: coreModeConfigs[parsedMode].wordLength,
    };
  }

  return {
    boards: Math.max(modeOrBoards, 1),
    wordLength: 5,
  };
};

export const getSolution = async (
  date: Date,
  modeOrBoards: number = 1,
  language: GameLanguage = DEFAULT_LANGUAGE,
): Promise<Solution> => {
  const nextDate = getNextGameDate(date);
  const index = getIndex(date);
  const { boards, wordLength } = getResolvedModeConfig(modeOrBoards);
  const supabase = getLetrixBrowserClient();

  if (!supabase) {
    return {
      solution: [],
      displaySolution: [],
      solutionDate: date,
      solutionIndex: index,
      tomorrow: nextDate.valueOf(),
      language,
    };
  }

  const dateLabel = formatISO(date, { representation: "date" });
  const parsedMode = parseCoreGameMode(modeOrBoards) ?? 1;

  const { data, error } = await supabase
    .from("daily_puzzles")
    .select("board_index, solution_normalized, solution_display")
    .eq("puzzle_date", dateLabel)
    .eq("language", language)
    .eq("mode", parsedMode)
    .order("board_index", { ascending: true });

  const rows = (data ?? []) as DailyPuzzleRow[];

  const boardRows =
    !error && rows.length >= boards
      ? rows
      : await getFallbackRowsFromDictionary({
          supabase,
          dateLabel,
          language,
          mode: parsedMode,
          boards,
          wordLength,
        });

  if (!boardRows.length) {
    return {
      solution: [],
      displaySolution: [],
      solutionDate: date,
      solutionIndex: index,
      tomorrow: nextDate.valueOf(),
      language,
    };
  }

  const sortedRows = boardRows
    .slice(0, boards)
    .sort((left, right) => left.board_index - right.board_index);

  return {
    solution: sortedRows.map((entry) =>
      normalizeWord(entry.solution_normalized),
    ),
    displaySolution: sortedRows.map((entry) => entry.solution_display),
    solutionDate: date,
    solutionIndex: index,
    tomorrow: nextDate.valueOf(),
    language,
  };
};

export const getGameDate = () => {
  if (getIsLatestGame()) {
    return startOfToday();
  }

  return startOfToday();
};

export const setGameDate = (d: Date) => {
  try {
    if (d < startOfToday()) {
      window.location.href = "/?d=" + formatISO(d, { representation: "date" });
      return;
    }
  } catch (_e) {
    // noop
  }
  window.location.href = "/";
};

export const getIsLatestGame = () => {
  return true;
};
