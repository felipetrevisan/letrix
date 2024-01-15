import React, { useEffect } from "react";

import BackspaceIcon from "@mui/icons-material/BackspaceRounded";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturnRounded";
import { getStatuses } from "@/lib/statuses";
import { Key } from "./key";

type Props = {
  isRevealing: boolean;
  guesses: string[];
  solutions: string;
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
  const buttonStatus = getStatuses(guesses, solutions);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.code === "Enter") {
        onEnter();
      } else if (e.code === "Backspace") {
        onDelete();
      } else {
        const key = e.key.toUpperCase();
        if (key.length === 1 && key >= "A" && key <= "Z") {
          onTyping(key);
        }
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onEnter, onDelete, onTyping]);

  const onClick = (value: string) => {
    if (value === "Enter") {
      onEnter();
    } else if (value === "Delete") {
      onDelete();
    } else {
      onTyping(value);
    }
  };

  return (
    <div className="grid grid-cols-keyboard gap-1">
      {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((key) => (
        <Key
          value={key}
          key={key}
          isRevealing={isRevealing}
          disabled={disabled}
          status={buttonStatus[key.toLocaleLowerCase()]}
          onClick={onClick}
          solution={solutions[0]}
        />
      ))}
      {["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((key) => (
        <>
          {key === "A" ? (
            <Key
              value={key}
              key={key}
              isRevealing={isRevealing}
              disabled={disabled}
              status={buttonStatus[key.toLocaleLowerCase()]}
              onClick={onClick}
              solution={solutions[0]}
              className="space"
            />
          ) : (
            <Key
              value={key}
              key={key}
              isRevealing={isRevealing}
              disabled={disabled}
              status={buttonStatus[key.toLocaleLowerCase()]}
              onClick={onClick}
              solution={solutions[0]}
            />
          )}
        </>
      ))}
      <Key value="Enter" large onClick={onClick} disabled={disabled} asChild>
        <KeyboardReturnIcon />
      </Key>
      {["Z", "X", "C", "V", "B", "N", "M"].map((key) => (
        <Key
          value={key}
          key={key}
          isRevealing={isRevealing}
          disabled={disabled}
          status={buttonStatus[key.toLocaleLowerCase()]}
          onClick={onClick}
          solution={solutions[0]}
        />
      ))}
      <Key value="Delete" large onClick={onClick} disabled={disabled} asChild>
        <BackspaceIcon />
      </Key>
    </div>
  );
}
