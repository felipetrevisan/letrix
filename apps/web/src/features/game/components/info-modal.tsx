"use client";

import {
  ArrowLeftRight,
  CornerDownLeft,
  Delete,
  Lightbulb,
  SpellCheck2,
} from "lucide-react";
import { Tile } from "@/features/game/components/Tiles";
import { useGame } from "@/contexts/GameContext";
import { getInfoDescription, infoCopy } from "@/lib/copy";
import { Base } from "@/features/shared/components/dialog-base";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
};

type ExampleStatus = "correct" | "present" | "absent";

type ExampleRowProps = {
  word: string;
  highlightLetter: string;
  highlightStatus: ExampleStatus;
  description: string;
};

const ExampleRow = ({
  word,
  highlightLetter,
  highlightStatus,
  description,
}: ExampleRowProps) => {
  return (
    <article className="rounded-xl border border-border/65 bg-background/80 p-4">
      <div className="mb-4 grid w-fit grid-cols-5 gap-1">
        {word
          .toUpperCase()
          .split("")
          .map((letter, index) => (
            <Tile
              key={`${word}_${letter}_${index}`}
              value={letter}
              isCompleted
              status={letter === highlightLetter ? highlightStatus : "absent"}
              isActive={false}
              size="small"
            />
          ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {infoCopy.descriptionLetter}{" "}
        <span className="font-semibold text-foreground">
          {highlightLetter.toUpperCase()}
        </span>{" "}
        {description}
      </p>
    </article>
  );
};

export const InfoModal = ({ isOpen, handleClose }: Props) => {
  const { getMaxChallenges } = useGame();
  const shortcuts = [
    { icon: CornerDownLeft, key: "Enter", description: "confirma a palavra" },
    {
      icon: Delete,
      key: "Backspace",
      description: "apaga a letra selecionada",
    },
    { icon: ArrowLeftRight, key: "← / →", description: "muda a casa atual" },
  ];

  return (
    <Base
      title={infoCopy.title}
      isOpen={isOpen}
      showHeader
      handleClose={handleClose}
      contentScrollable
      className="max-w-3xl"
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-border/65 bg-muted/35 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="size-4" />
            Regras rápidas
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {getInfoDescription(getMaxChallenges())}
          </p>
          <div className="mt-3 rounded-lg border border-border/55 bg-background/70 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <SpellCheck2 className="size-4" />
              Acentos e cedilha
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Você pode digitar sem acento. Na revelação, o jogo mostra
              automaticamente a forma correta da palavra.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border/65 bg-background/80 p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Atalhos de teclado
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {shortcuts.map(({ icon: Icon, key, description }) => (
              <article
                key={key}
                className="rounded-lg border border-border/55 bg-muted/35 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="size-4 text-foreground/85" />
                  <span className="rounded-md border border-border/60 bg-background px-2 py-0.5 font-mono text-xs text-foreground">
                    {key}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="space-y-3">
          <ExampleRow
            word={infoCopy.wordExampleCorrectSpot}
            highlightLetter={infoCopy.wordExampleCorrectLetterSpot.toUpperCase()}
            highlightStatus="correct"
            description={infoCopy.descriptionCorrectWordSpot}
          />
          <ExampleRow
            word={infoCopy.wordExampleWrongSpot}
            highlightLetter={infoCopy.wordExampleWrongLetterSpot.toUpperCase()}
            highlightStatus="present"
            description={infoCopy.descriptionWrongWordSpot}
          />
          <ExampleRow
            word={infoCopy.wordExampleAbsentSpot}
            highlightLetter={infoCopy.wordExampleAbsentLetterSpot.toUpperCase()}
            highlightStatus="absent"
            description={infoCopy.descriptionAbsentWordSpot}
          />
        </div>
      </div>
    </Base>
  );
};
