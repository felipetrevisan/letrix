"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Boards } from "@/components/Board";
import { Keyboard } from "@/components/Keyboard";
import { StatsModal } from "@/components/Modals/Stats";
import { Toaster } from "@/components/ui/sonner";
import { REVEAL_TIME_MS } from "@/config/settings";
import { useApp } from "@/contexts/AppContext";
import { useGame } from "@/contexts/GameContext";
import {
  loadGameStateFromLocalStorage,
  saveGameStateToLocalStorage,
} from "@/lib/localStorage";
import { addStatsForCompletedGame } from "@/lib/stats";
import {
  findFirstUnusedReveal,
  getGameDate,
  getIsLatestGame,
  isWinningWord,
  isWordInWordList,
  localeAwareLowerCase,
  unicodeLength,
} from "@/lib/words";
import { isEndGame } from "@/lib/game";
import { GameMode } from "@/interfaces/game";
import { Loading } from "@/components/ui/loading";

export default function Home() {
  const {
    storage,
    isInfoModalOpen,
    isStatsModalOpen,
    isSettingsModalOpen,
    isMenuOpen,
    isLoading,
    openMenu,
    closeMenu,
    loading,
    setIsInfoModalOpen,
    setIsStatsModalOpen,
  } = useApp();

  const {
    currentRow,
    solutions,
    currentGuess,
    guesses,
    invalidGuesses,
    stats,
    changeGameMode,
    setCurrentGuess,
    setInvalidGuesses,
    setGuesses,
    setStats,
    onTyping,
    onDelete,
    getMaxChallenges,
    getName,
  } = useGame();
  const isLatestGame = getIsLatestGame();
  const gameDate = getGameDate();
  const translate = useTranslations("alerts");
  const title = useTranslations("global");

  const [currentRowClass, setCurrentRowClass] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [internalGuesses, setInternalGuesses] = useState<string[]>(() => {
    const [state] = loadGameStateFromLocalStorage(isLatestGame, getName());

    if (state?.solution !== solutions.solution[0]) {
      return [];
    }

    const gameWasWon = state?.tries?.includes(solutions.solution[0]);

    if (gameWasWon) {
      setIsGameWon(true);
    }

    if (state?.tries?.length === getMaxChallenges() && !gameWasWon) {
      setIsGameOver(true);
    }

    return state?.tries ?? [];
  });

  useEffect(() => {
    if (isMenuOpen) closeMenu();
    changeGameMode(GameMode.term);
    setGuesses(internalGuesses);

    loading();

    if (!loadGameStateFromLocalStorage(true, getName())) {
      setTimeout(() => {
        setIsInfoModalOpen(true);
      }, REVEAL_TIME_MS);
    }
  }, []);

  useEffect(() => {
    saveGameStateToLocalStorage(
      false,
      [
        {
          curRow: currentRow,
          curTry: currentGuess,
          invalids: invalidGuesses,
          gameOver: isGameOver,
          won: isGameWon,
          tries: guesses,
          solution: solutions.solution[0],
          curday: solutions.solutionIndex,
        },
      ],
      getName()
    );
  }, [guesses]);

  useEffect(() => {
    if (isGameWon || isGameOver) {
      setTimeout(() => {
        openMenu();
        setIsStatsModalOpen(true);
      }, REVEAL_TIME_MS);
    }
  }, [isGameWon, isGameOver]);

  const clearCurrentRowClass = () => {
    setCurrentRowClass("");
  };

  const onEnter = () => {
    if (isEndGame(isGameWon, isGameOver)) return;

    if (!(unicodeLength(currentGuess) === solutions.solution[0].length)) {
      setCurrentRowClass("tile-shake");

      return toast.error(translate("not_enough_letters"), {
        onAutoClose: clearCurrentRowClass,
        position: "top-center",
      });
    }

    if (!isWordInWordList(currentGuess)) {
      setCurrentRowClass("tile-shake");
      setInvalidGuesses([
        ...invalidGuesses,
        localeAwareLowerCase(currentGuess),
      ]);

      return toast.error(translate("word_not_found"), {
        onAutoClose: clearCurrentRowClass,
        position: "top-center",
      });
    }

    if (storage?.hardMode) {
      const firstMissingReveal = findFirstUnusedReveal(currentGuess, guesses);

      if (firstMissingReveal) {
        setCurrentRowClass("tile-shake");

        return toast.error(firstMissingReveal, {
          onAutoClose: clearCurrentRowClass,
          position: "top-center",
        });
      }
    }

    setIsRevealing(true);

    setTimeout(() => {
      setIsRevealing(false);
    }, REVEAL_TIME_MS * solutions.solution[0].length);

    const winningWord = isWinningWord(currentGuess, solutions.solution[0]);

    if (
      unicodeLength(currentGuess) === solutions.solution[0].length &&
      guesses.length < getMaxChallenges() &&
      !isGameWon
    ) {
      setGuesses([...guesses, localeAwareLowerCase(currentGuess)]);
      setCurrentGuess("");
      setInvalidGuesses([]);

      if (winningWord) {
        setIsGameWon(true);
        setCurrentRowClass("tile-right");
        setStats(
          addStatsForCompletedGame(
            stats,
            guesses.length,
            getMaxChallenges(),
            getName()
          )
        );

        return toast.success(
          translate("winner", { row: getMaxChallenges() - currentRow }),
          {
            onAutoClose: () => {
              clearCurrentRowClass();
            },
            position: "top-center",
          }
        );
      }

      if (guesses.length === getMaxChallenges() - 1) {
        setStats(
          addStatsForCompletedGame(
            stats,
            guesses.length + 1,
            getMaxChallenges(),
            getName()
          )
        );
        setIsGameOver(true);

        return toast.error(
          translate("gameover", {
            words: solutions.solution.length,
            solutions: solutions.solution
              .map((w) => w.toLocaleLowerCase())
              .join(", "),
          }),
          {
            onAutoClose: clearCurrentRowClass,
            position: "top-center",
          }
        );
      }
    }
  };

  const classes = clsx(
    "container w-screen h-screen flex justify-center transform board single",
    {
      "blur-sm": isInfoModalOpen || isStatsModalOpen || isSettingsModalOpen,
    }
  );

  return (
    <>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <div className={classes}>
            <div className="flex flex-col items-center justify-center gap-12 w-full">
              <div className="flex items-center justify-center text-center bg-primary rounded-b-full p-2 absolute -top-[68px]">
                <h1 className="text-2xl font-bold text-primary-foreground tracking-widest w-80">
                  {title(getName())}
                </h1>
              </div>
              <div className="flex justify-center">
                <Boards
                  solutions={solutions.solution}
                  currentRowClass={currentRowClass}
                  isRevealing={isRevealing}
                  isEndGame={isGameOver || isGameWon}
                />
              </div>
              <div className="flex flex-col items-center">
                <Keyboard
                  guesses={guesses ?? []}
                  isRevealing={isRevealing}
                  onEnter={onEnter}
                  onDelete={onDelete}
                  onTyping={(key) =>
                    onTyping(
                      key,
                      solutions.solution[0],
                      getMaxChallenges(),
                      isEndGame(isGameWon, isGameOver)
                    )
                  }
                  solutions={solutions.solution[0]}
                  disabled={isEndGame(isGameWon, isGameOver)}
                />
              </div>
            </div>
          </div>
          {isStatsModalOpen && (
            <StatsModal
              isOpen={isStatsModalOpen}
              handleClose={() => setIsStatsModalOpen(false)}
              solution={solutions.solution[0]}
              guesses={guesses}
              gameStats={stats}
              isLatestGame={isLatestGame}
              isGameOver={isGameOver}
              isGameWon={isGameWon}
              numberOfGuessesMade={guesses.length}
            />
          )}
          <Toaster richColors />
        </>
      )}
    </>
  );
}
