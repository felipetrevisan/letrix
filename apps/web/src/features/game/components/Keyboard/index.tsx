import {
  GripHorizontal,
  CornerDownLeft,
  Delete,
  MousePointerClick,
} from "lucide-react";
import { motion, useDragControls } from "motion/react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
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
  const { storage, saveConfig } = useApp();
  const { currentGuess, selectedTileIndex, setSelectedTileIndex } = useGame();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState({
    x: storage?.keyboardOffsetX ?? 0,
    y: storage?.keyboardOffsetY ?? 0,
  });
  const dragControls = useDragControls();
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
    setKeyboardOffset({
      x: storage?.keyboardOffsetX ?? 0,
      y: storage?.keyboardOffsetY ?? 0,
    });
  }, [storage?.keyboardOffsetX, storage?.keyboardOffsetY]);

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

  const handleKeyboardDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number } },
  ) => {
    const maxOffsetX =
      typeof window !== "undefined" && window.innerWidth < 768 ? 72 : 180;
    const maxOffsetY =
      typeof window !== "undefined" && window.innerWidth < 768 ? 120 : 240;
    const nextOffset = {
      x: Math.max(
        -maxOffsetX,
        Math.min(maxOffsetX, keyboardOffset.x + info.offset.x),
      ),
      y: Math.max(
        -maxOffsetY,
        Math.min(maxOffsetY, keyboardOffset.y + info.offset.y),
      ),
    };

    setKeyboardOffset(nextOffset);
    saveConfig({
      keyboardOffsetX: nextOffset.x,
      keyboardOffsetY: nextOffset.y,
    });
  };

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDragEnd={handleKeyboardDragEnd}
      animate={{ x: keyboardOffset.x, y: keyboardOffset.y }}
      transition={{ type: "spring", stiffness: 240, damping: 26, mass: 0.7 }}
      className="w-full max-w-[min(100vw-0.75rem,42rem)] shrink-0 md:max-w-[min(100vw-2rem,42rem)]"
    >
      <button
        type="button"
        className="mx-auto mb-2 flex h-6 items-center justify-center rounded-full border border-border/50 bg-background/75 px-3 text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
        aria-label="Mover teclado"
        onPointerDown={(event) => dragControls.start(event)}
      >
        <GripHorizontal className="size-4" />
      </button>
      <div
        className="surface-panel keyboard-grid flex flex-col gap-1 p-1.5 md:p-2.5"
        onMouseLeave={() => setHoveredKey(null)}
      >
        <div className="grid grid-cols-10 gap-1">
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
                className={`col-span-1 ${letterState.absentClassName ?? ""}`.trim()}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-10 gap-1">
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
                  className={`col-span-1 ${letterState.absentClassName ?? ""}`.trim()}
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
            onClick={onClick}
            disabled={disabled}
            asChild
            motionIndex={150}
            hovered={hoveredKey === "Enter"}
            onHoverStart={setHoveredKey}
            className="col-span-1"
          >
            <CornerDownLeft className="size-5" />
          </Key>
        </div>

        <div className="grid grid-cols-8 gap-1">
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
                className={`col-span-1 ${letterState.absentClassName ?? ""}`.trim()}
                motionIndex={200 + index}
                hovered={hoveredKey === key}
                onHoverStart={setHoveredKey}
              />
            );
          })}

          <Key
            key="backspace"
            value="Delete"
            onClick={onClick}
            disabled={disabled}
            asChild
            motionIndex={300}
            hovered={hoveredKey === "Delete"}
            onHoverStart={setHoveredKey}
            className="col-span-1"
          >
            <Delete className="size-5" />
          </Key>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <MousePointerClick className="size-3.5" />
        <span>
          Clique em qualquer casa da linha ativa para corrigir letras sem apagar
          tudo.
        </span>
      </div>
    </motion.div>
  );
}
