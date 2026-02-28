"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftRight,
  CornerDownLeft,
  Delete,
  Lightbulb,
  SpellCheck2,
} from "lucide-react";
import { createFadeUpMotion, staggerDelay } from "@/config/motion-variants";
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
    <article className="surface-panel p-4">
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
  const shouldReduceMotion = useReducedMotion() ?? false;
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
        <motion.section
          className="surface-panel-subtle p-4"
          {...createFadeUpMotion({
            distance: 10,
            reducedMotion: shouldReduceMotion,
          })}
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="size-4" />
            Regras rápidas
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {getInfoDescription(getMaxChallenges())}
          </p>
          <div className="surface-panel-frame mt-3 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <SpellCheck2 className="size-4" />
              Acentos e cedilha
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Você pode digitar sem acento. Na revelação, o jogo mostra
              automaticamente a forma correta da palavra.
            </p>
          </div>
        </motion.section>

        <motion.section
          className="surface-panel p-4"
          {...createFadeUpMotion({
            distance: 10,
            delay: staggerDelay(1, 0.04, 0.18),
            reducedMotion: shouldReduceMotion,
          })}
        >
          <h3 className="text-sm font-semibold text-foreground">
            Atalhos de teclado
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {shortcuts.map(({ icon: Icon, key, description }) => (
              <article key={key} className="surface-panel-card p-3">
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
        </motion.section>

        <motion.div
          className="space-y-3"
          {...createFadeUpMotion({
            distance: 10,
            delay: staggerDelay(2, 0.04, 0.18),
            reducedMotion: shouldReduceMotion,
          })}
        >
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
        </motion.div>
      </div>
    </Base>
  );
};
