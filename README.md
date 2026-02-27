# Letrix PT Monorepo

Monorepo com jogo estilo Letrix em português, com modos:

- `single` (1 palavra)
- `duo` (2 palavras)
- `trio` (3 palavras)
- `quarteto` (4 palavras)

## Stack

- `bun` workspaces
- `next@16`
- `react@19`
- `tailwindcss@4`
- `biome` (lint/format)
- `shadcn` + `motion` (base para componentes Animated UI)

## Estrutura

- `apps/web`: aplicação Next.js
- `packages/game-core`: regras/utilitários compartilhados do jogo

## Comandos

```bash
bun install
bun run dev
bun run build
bun run check
bun run format
```

## App web direto

```bash
bun --cwd apps/web run dev
bun --cwd apps/web run build
bun --cwd apps/web run start
```

## Supabase (palavras + login + sync)

### 1. Variáveis de ambiente

Crie `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUA_ANON_KEY"
```

Você pode começar com:

```bash
cp apps/web/.env.example apps/web/.env.local
```

### 2. Criar schema

No SQL Editor do Supabase, execute:

1. `supabase/sql/001_init.sql`
2. `supabase/sql/002_seed_example.sql` (apenas exemplo dev)

### 3. Popular dicionário e puzzles diários

- `public.words`:
  - `language`: `pt` ou `en`
  - `normalized_word`: sem acento/cedilha (ex: `lapis`)
  - `display_word`: como será exibida (ex: `lápis`)
  - `word_length`: tamanho da palavra
- `public.daily_puzzles`:
  - uma linha por `date + language + mode + board_index`
  - inclui `solution_normalized` e `solution_display`

Você pode importar por script:

1. Copie os exemplos:

```bash
cp supabase/data/words.sample.json supabase/data/words.json
cp supabase/data/puzzles.sample.json supabase/data/puzzles.json
```

2. Execute import:

```bash
SUPABASE_URL="https://SEU-PROJETO.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY" \
bun run supabase:import
```

Template de env para import: `supabase/.env.import.example`

Opções úteis:

- `--dry-run`: valida sem gravar
- `--truncate`: apaga `words` e `daily_puzzles` antes de importar
- `--words <caminho>` e `--puzzles <caminho>`: arquivos customizados

### 4. Auth

- Ative no Supabase Auth:
  - Email (magic link)
  - Google OAuth
  - Discord OAuth
- Configure URLs de redirecionamento:
  - `http://localhost:3000/*` (dev)
  - `https://SEU-DOMINIO/*` (produção)
- O login fica na tela de `Configurações`.

### 5. Multi-device

- Usuário logado: progresso e stats salvam no Supabase.
- Usuário anônimo: fallback em localStorage.
