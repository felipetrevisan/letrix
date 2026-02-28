import type { Status } from "@/lib/statuses";

type KeyboardStatusesByBoard = Array<Record<string, Status | undefined>>;

type ResolveLetterStateParams = {
  key: string;
  statusesByBoard: KeyboardStatusesByBoard;
  activeStatusesByBoard?: KeyboardStatusesByBoard;
  disabled: boolean;
  isMultiBoardMode: boolean;
};

type ResolveKeyDownActionParams = {
  code: string;
  key: string;
  disabled: boolean;
  solutionLength: number;
  selectedTileIndex: number;
};

export type KeyboardLetterState = {
  status: Status | undefined;
  statusSegments: Array<Status | undefined> | undefined;
  disabled: boolean;
  absentClassName: string | undefined;
};

export type KeyboardAction =
  | { type: "noop" }
  | { type: "enter" }
  | { type: "delete" }
  | { type: "move"; nextTileIndex: number }
  | { type: "type"; value: string };

export const resolveKeyboardLetterState = ({
  key,
  statusesByBoard,
  activeStatusesByBoard,
  disabled,
  isMultiBoardMode,
}: ResolveLetterStateParams): KeyboardLetterState => {
  const normalizedKey = key.toLocaleLowerCase();
  const statusSegments = statusesByBoard.map(
    (boardStatus) => boardStatus[normalizedKey] as Status | undefined,
  );
  const relevantStatusesByBoard =
    activeStatusesByBoard && activeStatusesByBoard.length > 0
      ? activeStatusesByBoard
      : statusesByBoard;
  const activeStatusSegments = relevantStatusesByBoard.map(
    (boardStatus) => boardStatus[normalizedKey] as Status | undefined,
  );
  const statusPriority = statusSegments.reduce<Status | undefined>(
    (best, current) => {
      if (current === "correct" || best === "correct") {
        return "correct";
      }
      if (current === "present" || best === "present") {
        return "present";
      }
      if (current === "absent" || best === "absent") {
        return "absent";
      }
      return undefined;
    },
    undefined,
  );
  const allAbsent =
    activeStatusSegments.length > 0 &&
    activeStatusSegments.every((status) => status === "absent");
  const shouldDisable = isMultiBoardMode
    ? allAbsent
    : statusPriority === "absent";

  return {
    status: isMultiBoardMode || shouldDisable ? undefined : statusPriority,
    statusSegments: isMultiBoardMode ? statusSegments : undefined,
    disabled: disabled || shouldDisable,
    absentClassName: shouldDisable ? "key-absent-disabled" : undefined,
  };
};

export const resolveKeyboardAction = ({
  code,
  key,
  disabled,
  solutionLength,
  selectedTileIndex,
}: ResolveKeyDownActionParams): KeyboardAction => {
  if (disabled) {
    return { type: "noop" };
  }

  if (code === "Enter") {
    return { type: "enter" };
  }

  if (code === "Backspace") {
    return { type: "delete" };
  }

  if (code === "ArrowLeft") {
    const maxIndex = Math.max(solutionLength - 1, 0);
    return {
      type: "move",
      nextTileIndex: Math.max(Math.min(selectedTileIndex - 1, maxIndex), 0),
    };
  }

  if (code === "ArrowRight") {
    const maxIndex = Math.max(solutionLength - 1, 0);
    return {
      type: "move",
      nextTileIndex: Math.max(Math.min(selectedTileIndex + 1, maxIndex), 0),
    };
  }

  const normalizedKey = key.toUpperCase();
  if (
    normalizedKey.length === 1 &&
    normalizedKey >= "A" &&
    normalizedKey <= "Z"
  ) {
    return { type: "type", value: normalizedKey };
  }

  return { type: "noop" };
};
