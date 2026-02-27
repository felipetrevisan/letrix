import { useApp } from "@/contexts/AppContext";
import { Status } from "@/lib/statuses";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { CSSProperties, useEffect, useRef, useState } from "react";

type Props = {
  guess?: string;
  value?: string | undefined;
  status?: Status;
  isRevealing?: boolean;
  isCompleted?: boolean;
  isActive?: boolean;
  isSelected?: boolean;
  isEndGame?: boolean;
  position?: number;
  className?: string;
  readOnly?: boolean;
  size?: "large" | "small";
  revealDelayMs?: number;
  onSelect?: () => void | undefined;
};

export function Tile({
  value = "",
  status,
  isRevealing = false,
  isCompleted = false,
  isActive = false,
  isEndGame = false,
  isSelected,
  position = 0,
  className,
  readOnly,
  size = "large",
  revealDelayMs,
  onSelect,
}: Props) {
  const { storage } = useApp();
  const [isTypingAnimationActive, setIsTypingAnimationActive] = useState(false);
  const [isDeletingAnimationActive, setIsDeletingAnimationActive] =
    useState(false);
  const previousValueRef = useRef(value);
  const isRevealed = Boolean(status);

  useEffect(() => {
    const previousValue = previousValueRef.current;
    const hadValue = !!previousValue;
    const hasValue = !!value;
    const isEditableTile = isActive && !isCompleted && !isEndGame;

    if (isEditableTile) {
      if (
        (!hadValue && hasValue) ||
        (hadValue && hasValue && previousValue !== value)
      ) {
        setIsDeletingAnimationActive(false);
        setIsTypingAnimationActive(true);
      }

      if (hadValue && !hasValue) {
        setIsTypingAnimationActive(false);
        setIsDeletingAnimationActive(true);
      }
    }

    previousValueRef.current = value;
  }, [value, isActive, isCompleted, isEndGame]);

  useEffect(() => {
    if (!isTypingAnimationActive) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsTypingAnimationActive(false);
    }, 170);

    return () => window.clearTimeout(timeout);
  }, [isTypingAnimationActive]);

  useEffect(() => {
    if (!isDeletingAnimationActive) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsDeletingAnimationActive(false);
    }, 170);

    return () => window.clearTimeout(timeout);
  }, [isDeletingAnimationActive]);

  const classes = cva(["tile", className], {
    variants: {
      size: {
        large: "large",
        small: "small",
      },
      status: {
        false: "",
        absent: "absent",
        correct: "correct",
        present: "present",
      },
      inverted: {
        true: "inverted",
      },
      typing: {
        true: "typing",
      },
      deleting: {
        true: "deleting",
      },
      // reveal: {
      //   true: "reveal",
      // },
    },
    defaultVariants: {
      size: "large",
      status: false,
      inverted: false,
      //reveal: false,
    },
  });

  // const classes = clsx("tile", className, {
  //   "tile-small": size === "small",
  //   //"tile-active": isActiveTile,
  //   "tile-absent": status === "absent",
  //   "tile-correct inverted": status === "correct" && storage?.highContrast,
  //   "tile-present inverted": status === "present" && storage?.highContrast,
  //   "tile-correct": status === "correct" && !storage?.highContrast,
  //   "tile-present": status === "present" && !storage?.highContrast,
  //   "tile-scale": isFilledTile,
  //   "tile-reveal": shouldRevealTile,
  //   "pointer-events-none": readOnly || status,
  //   "p-2 w-11": size === "small",
  // });

  return (
    <div
      className={cn(
        classes({
          size,
          status,
          inverted: storage?.highContrast,
          typing: isTypingAnimationActive,
          deleting: isDeletingAnimationActive,
        }),
      )}
      style={
        revealDelayMs !== undefined
          ? ({ "--reveal-delay": `${revealDelayMs}ms` } as CSSProperties)
          : undefined
      }
      onClick={onSelect}
      data-tile={position}
      data-selected={isSelected}
      data-revealed={isRevealed}
    >
      <div className="tile-inner">
        <div className="tile-face tile-face-front">
          <div className="letter">{value}</div>
        </div>
        <div className="tile-face tile-face-back">
          <div className="letter">{value}</div>
        </div>
      </div>
    </div>
  );
}
