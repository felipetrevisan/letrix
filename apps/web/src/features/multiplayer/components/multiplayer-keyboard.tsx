"use client";

import { CornerDownLeft, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  disabled?: boolean;
  letterStates?: Record<
    string,
    {
      status?: "correct" | "present" | "absent";
      disabled?: boolean;
    }
  >;
  onType: (letter: string) => void;
  onDelete: () => void;
  onEnter: () => void;
};

const keyboardRows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
] as const;

export function MultiplayerKeyboard({
  disabled = false,
  letterStates = {},
  onType,
  onDelete,
  onEnter,
}: Props) {
  const renderLetterKey = (letter: string) => {
    const state = letterStates[letter] ?? {};
    const isLetterDisabled = disabled || Boolean(state.disabled);

    return (
      <Button
        key={letter}
        type="button"
        variant="ghost"
        className={cn(
          "key col-span-1 h-11 text-lg md:h-14 md:text-xl",
          state.status === "correct" && "key-correct",
          state.status === "present" && "key-present",
          state.status === "absent" && "key-absent",
          state.disabled && "key-absent-disabled",
        )}
        disabled={isLetterDisabled}
        onClick={() => onType(letter)}
      >
        {letter}
      </Button>
    );
  };

  return (
    <section className="surface-panel w-full p-3">
      <div className="grid gap-2">
        <div className="grid grid-cols-10 gap-2">
          {keyboardRows[0].map(renderLetterKey)}
        </div>

        <div className="grid grid-cols-10 gap-2">
          {keyboardRows[1].map(renderLetterKey)}
          <Button
            type="button"
            variant="ghost"
            className="key col-span-1 h-11 text-lg md:h-14 md:text-xl"
            disabled={disabled}
            onClick={onEnter}
          >
            <CornerDownLeft className="size-6" />
          </Button>
        </div>

        <div className="grid grid-cols-8 gap-2">
          {keyboardRows[2].map(renderLetterKey)}
          <Button
            type="button"
            variant="ghost"
            className={cn("key col-span-1 h-11 text-lg md:h-14 md:text-xl")}
            disabled={disabled}
            onClick={onDelete}
          >
            <Delete className="size-6" />
          </Button>
        </div>
      </div>
    </section>
  );
}
