export type DefinitionApiResponse = {
  definition: string | null;
  cached: boolean;
  source: "ai" | "manual" | "database" | null;
  status: "ready" | "pending" | "failed";
};

type FetchDefinitionParams = {
  language: "pt" | "en";
  normalizedWord: string;
  displayWord: string;
  wordLength: number;
};

export const fetchDefinition = async ({
  language,
  normalizedWord,
  displayWord,
  wordLength,
}: FetchDefinitionParams): Promise<DefinitionApiResponse> => {
  const response = await fetch("/api/definitions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      language,
      normalizedWord,
      displayWord,
      wordLength,
    }),
  });

  const payload = (await response.json()) as
    | DefinitionApiResponse
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Falha ao carregar definição.",
    );
  }

  return payload as DefinitionApiResponse;
};
