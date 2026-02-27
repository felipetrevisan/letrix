-- Example seed (development only)
-- Replace with your complete dictionaries and puzzle schedule.

insert into letrix.words (language, normalized_word, display_word, word_length, is_solution, is_active)
values
  ('pt', 'carta', 'carta', 5, true, true),
  ('pt', 'caixa', 'caixa', 5, true, true),
  ('pt', 'lapis', 'lápis', 5, true, true),
  ('pt', 'teclado', 'teclado', 7, false, true),
  ('pt', 'apartadora', 'apartadora', 10, true, true),
  ('en', 'crane', 'crane', 5, true, true),
  ('en', 'slate', 'slate', 5, true, true),
  ('en', 'elevators', 'elevators', 9, false, true),
  ('en', 'playground', 'playground', 10, true, true)
on conflict (language, normalized_word) do update
set
  display_word = excluded.display_word,
  word_length = excluded.word_length,
  is_solution = excluded.is_solution,
  is_active = excluded.is_active,
  updated_at = now();

-- Daily puzzles by date/language/mode/board
insert into letrix.daily_puzzles (
  puzzle_date,
  language,
  mode,
  board_index,
  solution_normalized,
  solution_display
)
values
  ('2026-02-25', 'pt', 1, 0, 'carta', 'carta'),
  ('2026-02-25', 'pt', 2, 0, 'carta', 'carta'),
  ('2026-02-25', 'pt', 2, 1, 'caixa', 'caixa'),
  ('2026-02-25', 'pt', 3, 0, 'carta', 'carta'),
  ('2026-02-25', 'pt', 3, 1, 'caixa', 'caixa'),
  ('2026-02-25', 'pt', 3, 2, 'lapis', 'lápis'),
  ('2026-02-25', 'pt', 4, 0, 'carta', 'carta'),
  ('2026-02-25', 'pt', 4, 1, 'caixa', 'caixa'),
  ('2026-02-25', 'pt', 4, 2, 'lapis', 'lápis'),
  ('2026-02-25', 'pt', 4, 3, 'carta', 'carta'),
  ('2026-02-25', 'pt', 5, 0, 'apartadora', 'apartadora'),
  ('2026-02-25', 'en', 1, 0, 'crane', 'crane'),
  ('2026-02-25', 'en', 2, 0, 'crane', 'crane'),
  ('2026-02-25', 'en', 2, 1, 'slate', 'slate'),
  ('2026-02-25', 'en', 5, 0, 'playground', 'playground')
on conflict (puzzle_date, language, mode, board_index) do update
set
  solution_normalized = excluded.solution_normalized,
  solution_display = excluded.solution_display;
