export type DefinitionLanguage = "pt" | "en";

export const DEFAULT_GEMINI_MODEL =
  process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export const buildDefinitionPrompt = ({
  language,
  displayWord,
}: {
  language: DefinitionLanguage;
  displayWord: string;
}) => {
  if (language === "en") {
    return `Define the word "${displayWord}" in English in a single short sentence, with no examples and no extra commentary. Return only the definition.`;
  }

  return `Defina a palavra "${displayWord}" em portugues do Brasil em uma frase curta, sem exemplos e sem comentarios extras. Retorne apenas a definicao.`;
};

export const extractDefinitionText = (payload: any) => {
  const textParts =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim() ?? "";

  const normalized = textParts
    .replace(/^["“”]+|["“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || null;
};

export const generateDefinitionWithGemini = async ({
  language,
  displayWord,
  model = DEFAULT_GEMINI_MODEL,
}: {
  language: DefinitionLanguage;
  displayWord: string;
  model?: string;
}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildDefinitionPrompt({ language, displayWord }),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 120,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini retornou ${response.status}: ${errorText || "erro desconhecido"}`,
    );
  }

  const payload = await response.json();
  const definition = extractDefinitionText(payload);

  if (!definition) {
    throw new Error("Gemini não retornou uma definição válida.");
  }

  return definition;
};
