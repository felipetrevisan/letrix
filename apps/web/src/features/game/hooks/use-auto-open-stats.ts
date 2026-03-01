"use client";

import { useCallback, useEffect, useRef } from "react";
import { REVEAL_TIME_MS } from "@/config/settings";
import type { Solution } from "@/interfaces/game";

type UseAutoOpenStatsParams = {
  gameEnded: boolean;
  isLoading: boolean;
  setIsStatsModalOpen: (open: boolean) => void;
  solutions: Solution;
};

export const useAutoOpenStats = ({
  gameEnded,
  isLoading,
  setIsStatsModalOpen,
  solutions,
}: UseAutoOpenStatsParams) => {
  const hasAutoOpenedStatsRef = useRef(false);

  const resetAutoOpenStats = useCallback(() => {
    hasAutoOpenedStatsRef.current = false;
  }, []);

  useEffect(() => {
    if (!gameEnded || isLoading || hasAutoOpenedStatsRef.current) {
      return;
    }

    hasAutoOpenedStatsRef.current = true;
    const timeout = setTimeout(
      () => {
        setIsStatsModalOpen(true);
      },
      REVEAL_TIME_MS * (solutions.solution[0]?.length ?? 5),
    );

    return () => clearTimeout(timeout);
  }, [gameEnded, isLoading, setIsStatsModalOpen, solutions.solution]);

  return { resetAutoOpenStats };
};
