"use client";

import { CornerDownLeft, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  disabled?: boolean;
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
  onType,
  onDelete,
  onEnter,
}: Props) {
  return (
    <section className="surface-panel w-full max-w-5xl p-3">
      <div className="grid gap-2">
        <div className="grid grid-cols-10 gap-2">
          {keyboardRows[0].map((letter) => (
            <Button
              key={letter}
              type="button"
              variant="ghost"
              className="key col-span-1 h-14 text-xl"
              disabled={disabled}
              onClick={() => onType(letter)}
            >
              {letter}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-10 gap-2">
          {keyboardRows[1].map((letter) => (
            <Button
              key={letter}
              type="button"
              variant="ghost"
              className="key col-span-1 h-14 text-xl"
              disabled={disabled}
              onClick={() => onType(letter)}
            >
              {letter}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="key col-span-1 h-14 text-xl"
            disabled={disabled}
            onClick={onEnter}
          >
            <CornerDownLeft className="size-6" />
          </Button>
        </div>

        <div className="grid grid-cols-8 gap-2">
          {keyboardRows[2].map((letter) => (
            <Button
              key={letter}
              type="button"
              variant="ghost"
              className="key col-span-1 h-14 text-xl"
              disabled={disabled}
              onClick={() => onType(letter)}
            >
              {letter}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            className={cn("key col-span-1 h-14 text-xl")}
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
