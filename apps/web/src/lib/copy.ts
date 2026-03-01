export const gameNames = {
  term: "Termo",
  duo: "Dueto",
  trio: "Trieto",
  four: "Quarteto",
  deca: "Quinteto",
  infinite: "Infinito",
} as const;

export const settingsCopy = {
  title: "Configurações",
  hardMode: "Modo Difícil",
  hardModeDescription:
    "As dicas reveladas devem ser usadas nas próximas tentativas.",
  theme: "Tema",
  highContrast: "Contraste Alto",
  resetSavedData: "Resetar Dados Salvos",
  resetSavedDataDone: "Os dados salvos do jogo foram resetados.",
} as const;

export const infoCopy = {
  title: "Como jogar",
  descriptionLetter: "A letra",
  descriptionCorrectWordSpot: "faz parte da palavra e está na posição correta.",
  descriptionWrongWordSpot: "faz parte da palavra mas em outra posição.",
  descriptionAbsentWordSpot: "não faz parte da palavra.",
  wordExampleCorrectSpot: "Mundo",
  wordExampleCorrectLetterSpot: "M",
  wordExampleWrongSpot: "Perto",
  wordExampleWrongLetterSpot: "R",
  wordExampleAbsentSpot: "Raios",
  wordExampleAbsentLetterSpot: "O",
} as const;

export const statsCopy = {
  title: "Progresso",
  guessDistributionTitle: "Distribuição de Tentativas",
  games: "jogos",
  successRate: "de vitórias",
  currentStreak: "sequência de vitórias",
  bestStreak: "melhor sequência",
  wins: "vitórias",
  failed: "derrotas",
  perfectWins: "acertos sem erro",
  currentPerfectStreak: "sequência perfeita atual",
  bestPerfectStreak: "recorde perfeito",
  nextWordIn: "Próxima palavra em:",
} as const;

export const alertsCopy = {
  hardModeEnabled:
    "Modo difícil só pode ser habilitado antes de começar o jogo",
  wordNotFound: "Essa palavra não existe",
} as const;

export const getNotEnoughLettersMessage = (length: number) => {
  return `Só palavras com ${length} letras`;
};

export const getInfoDescription = (retries: number) => {
  if (retries >= 999 || retries > 100) {
    return "Descubra a palavra sem limite de tentativas. Depois de cada tentativa, as peças mostram o quão perto você está da solução.";
  }

  if (retries === 1) {
    return "Descubra a palavra certa em 1 tentativa. Depois de cada tentativa, as peças mostram o quão perto você está da solução.";
  }

  return `Descubra a palavra certa em ${retries} tentativas. Depois de cada tentativa, as peças mostram o quão perto você está da solução.`;
};

export const getHighContrastStatusMessage = (isEnabled: boolean) => {
  return `Contraste alto ${isEnabled ? "ativado" : "desativado"}`;
};

export const getGameOverMessage = (words: string[]) => {
  return `${words.length === 1 ? "Palavra" : "Palavras"}: ${words
    .map((word) => word.toLocaleLowerCase())
    .join(", ")}`;
};

export const getWinnerMessage = (row: number) => {
  if (row === 0) return "Ufa!";
  if (row === 1) return "Genial";
  if (row === 2) return "Impressionante";
  if (row === 3) return "Extraordinário";
  if (row === 4) return "Fantástico";

  return "Fenomenal";
};
