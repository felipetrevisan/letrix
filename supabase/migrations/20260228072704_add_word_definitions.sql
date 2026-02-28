-- Letrix word definitions support
-- Generated for supabase db push

alter table if exists letrix.words
  add column if not exists definition text,
  add column if not exists definition_source text,
  add column if not exists definition_status text,
  add column if not exists definition_model text,
  add column if not exists definition_generated_at timestamptz,
  add column if not exists definition_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'words_definition_source_check'
      and conrelid = 'letrix.words'::regclass
  ) then
    alter table letrix.words
      add constraint words_definition_source_check
      check (
        definition_source is null
        or definition_source in ('ai', 'manual')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'words_definition_status_check'
      and conrelid = 'letrix.words'::regclass
  ) then
    alter table letrix.words
      add constraint words_definition_status_check
      check (
        definition_status is null
        or definition_status in ('pending', 'ready', 'failed')
      );
  end if;
end
$$;

update letrix.words
set
  definition_status = case
    when coalesce(nullif(trim(definition), ''), null) is null then 'pending'
    else 'ready'
  end,
  definition_source = case
    when coalesce(nullif(trim(definition), ''), null) is null then definition_source
    when definition_source is null then 'manual'
    else definition_source
  end,
  definition_updated_at = case
    when coalesce(nullif(trim(definition), ''), null) is null then definition_updated_at
    when definition_updated_at is null then now()
    else definition_updated_at
  end,
  definition_generated_at = case
    when coalesce(nullif(trim(definition), ''), null) is null then definition_generated_at
    when definition_generated_at is null then now()
    else definition_generated_at
  end
where
  definition is not null
  or definition_status is null
  or definition_source is null;

alter table letrix.words
  alter column definition_status set default 'pending';

create index if not exists words_definition_status_idx
  on letrix.words (definition_status);

create index if not exists words_definition_lookup_idx
  on letrix.words (language, normalized_word, definition_status);
