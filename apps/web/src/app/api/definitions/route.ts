import { NextResponse } from "next/server";
import { z } from "zod";
import { getLetrixServerClient } from "@/features/auth/lib/supabase-server";
import {
  DEFAULT_GEMINI_MODEL,
  generateDefinitionWithGemini,
} from "@/features/game/lib/gemini-definition";

const definitionRequestSchema = z.object({
  language: z.enum(["pt", "en"]),
  normalizedWord: z.string().trim().min(1).max(32),
  displayWord: z.string().trim().min(1).max(64),
  wordLength: z.number().int().min(2).max(32),
});

const GEMINI_MODEL = DEFAULT_GEMINI_MODEL;

type WordDefinitionRow = {
  normalized_word: string;
  display_word: string;
  definition: string | null;
  definition_source: "ai" | "manual" | null;
  definition_status: "pending" | "ready" | "failed" | null;
  definition_model: string | null;
};

export async function POST(request: Request) {
  const parseResult = definitionRequestSchema.safeParse(await request.json());

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos para carregar a definição." },
      { status: 400 },
    );
  }

  const supabase = getLetrixServerClient();

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase server não configurado. Defina NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_PROJECT_ID e SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  const { language, normalizedWord, displayWord, wordLength } =
    parseResult.data;

  const { data, error } = await supabase
    .from("words")
    .select(
      "normalized_word, display_word, definition, definition_source, definition_status, definition_model",
    )
    .eq("language", language)
    .eq("word_length", wordLength)
    .eq("normalized_word", normalizedWord)
    .eq("is_active", true)
    .maybeSingle();

  const wordRow = data as WordDefinitionRow | null;

  if (error) {
    return NextResponse.json(
      { error: "Falha ao consultar a definição no banco." },
      { status: 500 },
    );
  }

  if (!wordRow) {
    return NextResponse.json(
      { error: "Palavra não encontrada para definição." },
      { status: 404 },
    );
  }

  if (wordRow.definition?.trim()) {
    return NextResponse.json({
      definition: wordRow.definition,
      cached: true,
      source: wordRow.definition_source ?? "database",
      status: "ready",
    });
  }

  await (supabase.from("words") as any)
    .update({
      definition_status: "pending",
      definition_updated_at: new Date().toISOString(),
    })
    .eq("language", language)
    .eq("word_length", wordLength)
    .eq("normalized_word", normalizedWord);

  try {
    const definition = await generateDefinitionWithGemini({
      language,
      displayWord: wordRow.display_word || displayWord,
      model: GEMINI_MODEL,
    });

    await (supabase.from("words") as any)
      .update({
        definition,
        definition_source: "ai",
        definition_status: "ready",
        definition_model: GEMINI_MODEL,
        definition_generated_at: new Date().toISOString(),
        definition_updated_at: new Date().toISOString(),
      })
      .eq("language", language)
      .eq("word_length", wordLength)
      .eq("normalized_word", normalizedWord);

    return NextResponse.json({
      definition,
      cached: false,
      source: "ai",
      status: "ready",
    });
  } catch (generationError) {
    await (supabase.from("words") as any)
      .update({
        definition_status: "failed",
        definition_updated_at: new Date().toISOString(),
      })
      .eq("language", language)
      .eq("word_length", wordLength)
      .eq("normalized_word", normalizedWord);

    return NextResponse.json(
      {
        error:
          generationError instanceof Error
            ? generationError.message
            : "Não foi possível gerar a definição.",
      },
      { status: 502 },
    );
  }
}
