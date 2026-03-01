"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchDefinition } from "@/features/game/lib/definition-fetch";

const normalizeDefinitionText = (value?: string | null) => {
  const normalizedValue = value?.replace(/\\n/g, "\n").replace(/\r\n?/g, "\n");
  return normalizedValue?.trim() || null;
};

type SolvedRowDefinitionTooltipProps = {
  language: "pt" | "en";
  normalizedWord: string;
  word: string;
  definition?: string | null;
};

export function SolvedRowDefinitionTooltip({
  language,
  normalizedWord,
  word,
  definition,
}: SolvedRowDefinitionTooltipProps) {
  const [open, setOpen] = useState(false);
  const [resolvedDefinition, setResolvedDefinition] = useState(() =>
    normalizeDefinitionText(definition),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!open || resolvedDefinition || isLoading || hasRequestedRef.current) {
      return;
    }

    hasRequestedRef.current = true;
    setIsLoading(true);
    setLoadError(null);

    void fetchDefinition({
      language,
      normalizedWord,
      displayWord: word,
      wordLength: Array.from(normalizedWord).length,
    })
      .then((response) => {
        setResolvedDefinition(normalizeDefinitionText(response.definition));
      })
      .catch((error) => {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Definição indisponível no momento.",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [open, resolvedDefinition, isLoading, language, normalizedWord, word]);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute -right-3 top-1/2 z-20 h-7 w-7 -translate-y-1/2 rounded-full border-border/70 bg-background/92 text-foreground shadow-[0_10px_30px_hsl(var(--background)/0.35)] backdrop-blur hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/45"
            aria-label={`Ver definição de ${word}`}
          >
            <Info className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={10}
          className="surface-panel-card max-w-72 rounded-2xl px-3 py-3 text-left"
        >
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/85">
              Definição
            </p>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
              {word}
            </p>
            <p className="whitespace-pre-line text-sm leading-5 text-foreground/86">
              {isLoading
                ? "Gerando definição..."
                : resolvedDefinition ||
                  loadError ||
                  "Definição indisponível no momento."}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
