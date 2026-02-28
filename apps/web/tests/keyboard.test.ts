import { describe, expect, test } from "bun:test";
import {
  resolveKeyboardAction,
  resolveKeyboardLetterState,
} from "../src/features/game/session/keyboard";

describe("keyboard helpers", () => {
  test("resolves segmented status and disables only when all boards are absent", () => {
    const result = resolveKeyboardLetterState({
      key: "A",
      statusesByBoard: [{ a: "absent" }, { a: "present" }, { a: "correct" }],
      disabled: false,
      isMultiBoardMode: true,
    });

    expect(result.disabled).toBe(false);
    expect(result.status).toBeUndefined();
    expect(result.statusSegments).toEqual(["absent", "present", "correct"]);
    expect(result.absentClassName).toBeUndefined();
  });

  test("disables absent letter in single board mode", () => {
    const result = resolveKeyboardLetterState({
      key: "Z",
      statusesByBoard: [{ z: "absent" }],
      disabled: false,
      isMultiBoardMode: false,
    });

    expect(result.disabled).toBe(true);
    expect(result.status).toBeUndefined();
    expect(result.absentClassName).toBe("key-absent-disabled");
  });

  test("resolves arrow navigation within board bounds", () => {
    expect(
      resolveKeyboardAction({
        code: "ArrowLeft",
        key: "ArrowLeft",
        disabled: false,
        solutionLength: 5,
        selectedTileIndex: 0,
      }),
    ).toEqual({ type: "move", nextTileIndex: 0 });

    expect(
      resolveKeyboardAction({
        code: "ArrowRight",
        key: "ArrowRight",
        disabled: false,
        solutionLength: 5,
        selectedTileIndex: 4,
      }),
    ).toEqual({ type: "move", nextTileIndex: 4 });
  });

  test("maps physical keyboard events to game actions", () => {
    expect(
      resolveKeyboardAction({
        code: "Enter",
        key: "Enter",
        disabled: false,
        solutionLength: 5,
        selectedTileIndex: 2,
      }),
    ).toEqual({ type: "enter" });

    expect(
      resolveKeyboardAction({
        code: "Backspace",
        key: "Backspace",
        disabled: false,
        solutionLength: 5,
        selectedTileIndex: 2,
      }),
    ).toEqual({ type: "delete" });

    expect(
      resolveKeyboardAction({
        code: "KeyA",
        key: "a",
        disabled: false,
        solutionLength: 5,
        selectedTileIndex: 2,
      }),
    ).toEqual({ type: "type", value: "A" });
  });
});
