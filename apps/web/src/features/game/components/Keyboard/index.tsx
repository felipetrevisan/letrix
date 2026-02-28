import { CornerDownLeft, Delete, MousePointerClick } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import {
  resolveKeyboardAction,
  resolveKeyboardLetterState,
} from "@/features/game/session/keyboard";
import { Guess } from "@/interfaces/game";
import { getStatuses } from "@/lib/statuses";
import { Key } from "./key";

type Props = {
  isRevealing: boolean;
  guesses: Guess[];
  solutions: string[];
  disabled: boolean;
  onTyping: (key: string) => void;
  onDelete: () => void;
  onEnter: () => void;
};

export function Keyboard({
  isRevealing,
  guesses,
  solutions,
  disabled,
  onTyping,
  onEnter,
  onDelete,
}: Props) {
  const { currentGuess, selectedTileIndex, setSelectedTileIndex } = useGame();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const solutionLength = solutions[0]?.length ?? 5;
  const isMultiBoardMode = solutions.length > 1;
  const guessesWords = useMemo(
    () => guesses.map((guess) => guess.word),
    [guesses],
  );

  const statusesByBoard = useMemo(
    () => solutions.map((solution) => getStatuses(guessesWords, solution)),
    [guessesWords, solutions],
  );
  const boardStates = useMemo(
    () =>
      solutions.map((solution, index) => ({
        solution,
        status: statusesByBoard[index],
        solved: guessesWords.includes(solution),
      })),
    [guessesWords, solutions, statusesByBoard],
  );
  const activeStatusesByBoard = useMemo(
    () =>
      boardStates.filter((board) => !board.solved).map((board) => board.status),
    [boardStates],
  );
  const activeSegmentMask = useMemo(
    () => boardStates.map((board) => !board.solved),
    [boardStates],
  );
  const getLetterState = useCallback(
    (key: string) =>
      resolveKeyboardLetterState({
        key,
        statusesByBoard,
        activeStatusesByBoard,
        disabled,
        isMultiBoardMode,
      }),
    [activeStatusesByBoard, disabled, isMultiBoardMode, statusesByBoard],
  );

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const action = resolveKeyboardAction({
        code: event.code,
        key: event.key,
        disabled,
        solutionLength,
        selectedTileIndex,
      });

      if (action.type === "move") {
        event.preventDefault();
        setSelectedTileIndex(action.nextTileIndex);
        return;
      }

      if (action.type === "enter") {
        onEnter();
        return;
      }

      if (action.type === "delete") {
        onDelete();
        return;
      }

      if (action.type === "type") {
        onTyping(action.value);
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [
    disabled,
    onEnter,
    onDelete,
    onTyping,
    selectedTileIndex,
    setSelectedTileIndex,
    solutionLength,
  ]);

  const onClick = (value: string) => {
    if (disabled) {
      return;
    }

    if (value === "Enter") {
      onEnter();
      return;
    }

    if (value === "Delete") {
      onDelete();
      return;
    }

    onTyping(value);
  };

  return (
    <div className="w-full max-w-[min(100vw-2rem,42rem)]">
      <div
        className="surface-panel grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 p-2.5"
        onMouseLeave={() => setHoveredKey(null)}
      >
        {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((key) => {
          const letterState = getLetterState(key);
          return (
            <Key
              value={key}
              key={key}
              isRevealing={isRevealing}
              disabled={letterState.disabled}
              status={letterState.status}
              statusSegments={letterState.statusSegments}
              activeSegments={activeSegmentMask}
              onClick={onClick}
              solutionLength={solutionLength}
              motionIndex={key.charCodeAt(0)}
              hovered={hoveredKey === key}
              onHoverStart={setHoveredKey}
              className={letterState.absentClassName}
            />
          );
        })}

        {["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((key, index) => {
          const letterState = getLetterState(key);
          return (
            <Fragment key={`fragment_key_${key}`}>
              <Key
                value={key}
                key={key}
                isRevealing={isRevealing}
                disabled={letterState.disabled}
                status={letterState.status}
                statusSegments={letterState.statusSegments}
                activeSegments={activeSegmentMask}
                onClick={onClick}
                solutionLength={solutionLength}
                className={
                  key === "A"
                    ? `space ${letterState.absentClassName ?? ""}`.trim()
                    : letterState.absentClassName
                }
                motionIndex={100 + index}
                hovered={hoveredKey === key}
                onHoverStart={setHoveredKey}
              />
            </Fragment>
          );
        })}

        <Key
          key="return"
          value="Enter"
          size="large"
          onClick={onClick}
          disabled={disabled || currentGuess.word.length !== solutionLength}
          asChild
          motionIndex={150}
          hovered={hoveredKey === "Enter"}
          onHoverStart={setHoveredKey}
        >
          <CornerDownLeft className="size-5" />
        </Key>

        {["Z", "X", "C", "V", "B", "N", "M"].map((key, index) => {
          const letterState = getLetterState(key);
          return (
            <Key
              value={key}
              key={key}
              isRevealing={isRevealing}
              disabled={letterState.disabled}
              status={letterState.status}
              statusSegments={letterState.statusSegments}
              activeSegments={activeSegmentMask}
              onClick={onClick}
              solutionLength={solutionLength}
              motionIndex={200 + index}
              hovered={hoveredKey === key}
              onHoverStart={setHoveredKey}
              className={letterState.absentClassName}
            />
          );
        })}

        <Key
          key="backspace"
          value="Delete"
          size="large"
          onClick={onClick}
          disabled={disabled}
          asChild
          motionIndex={300}
          hovered={hoveredKey === "Delete"}
          onHoverStart={setHoveredKey}
        >
          <Delete className="size-5" />
        </Key>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <MousePointerClick className="size-3.5" />
        <span>
          Clique em qualquer casa da linha ativa para corrigir letras sem apagar
          tudo.
        </span>
      </div>
    </div>
  );
}
