"use client";

import { Copy, Crown, RefreshCcw, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REVEAL_TIME_MS } from "@/config/settings";
import { useApp } from "@/contexts/AppContext";
import {
  getLetrixBrowserClient,
  getSupabaseBrowserClient,
} from "@/features/auth/lib/supabase-client";
import { MultiplayerBoard } from "@/features/multiplayer/components/multiplayer-board";
import { MultiplayerKeyboard } from "@/features/multiplayer/components/multiplayer-keyboard";
import {
  loadMultiplayerRoomRequest,
  type MultiplayerApiError,
  requestMultiplayerRematchRequest,
  submitMultiplayerGuessRequest,
} from "@/features/multiplayer/lib/client";
import type {
  MultiplayerPrivateAttempt,
  MultiplayerRoomSnapshot,
} from "@/features/multiplayer/lib/types";
import type { Status } from "@/lib/statuses";

type Props = {
  locale: string;
  roomCode: string;
};

type BrowserRoomRow = {
  id: string;
  room_code: string;
  language: "pt" | "en";
  target_wins: number;
  max_attempts: number;
  word_length: number;
  current_round: number;
  status: "waiting" | "active" | "finished";
  created_by: string;
  winner_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  round_starts_at: string | null;
  rematch_requested_user_ids: string[] | null;
};

type BrowserPlayerRow = {
  user_id: string;
  slot: number;
  display_name: string;
  avatar_url: string | null;
  score: number;
  solved_current_round: boolean;
  attempts_used_current_round: number;
  masked_attempts: {
    statuses: MultiplayerRoomSnapshot["me"]["maskedAttempts"][number]["statuses"];
  }[];
};

type BrowserPrivateStateRow = {
  attempts: MultiplayerRoomSnapshot["me"]["attempts"];
};

const REVEAL_SETTLE_MS = REVEAL_TIME_MS * 6;
const LETTER_STATUS_PRIORITY: Record<Status, number> = {
  absent: 1,
  present: 2,
  correct: 3,
};
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function MultiplayerRoomPage({ locale, roomCode }: Props) {
  const router = useRouter();
  const { user, isAuthReady, setIsSettingsModalOpen } = useApp();
  const [snapshot, setSnapshot] = useState<MultiplayerRoomSnapshot | null>(
    null,
  );
  const [currentGuess, setCurrentGuess] = useState("");
  const [selectedTileIndex, setSelectedTileIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingRematch, setIsRequestingRematch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdownMs, setCountdownMs] = useState(0);
  const [animatedAttempt, setAnimatedAttempt] =
    useState<MultiplayerPrivateAttempt | null>(null);
  const [boardAnimation, setBoardAnimation] = useState<"revealing" | null>(
    null,
  );
  const pendingSnapshotRef = useRef<MultiplayerRoomSnapshot | null>(null);
  const revealTimeoutRef = useRef<number | null>(null);
  const isRevealLockedRef = useRef(false);
  const snapshotRef = useRef<MultiplayerRoomSnapshot | null>(null);

  const handleSelectTile = (index: number) => {
    const maxSelectableIndex = snapshot
      ? Math.min(currentGuess.length, snapshot.wordLength - 1)
      : 0;
    setSelectedTileIndex(Math.min(index, maxSelectableIndex));
  };

  const loadRoomFromBrowser = useCallback(async () => {
    if (!user) {
      return null;
    }

    const letrix = getLetrixBrowserClient();

    if (!letrix) {
      return null;
    }

    const { data: room } = await letrix
      .from("multiplayer_rooms")
      .select(
        "id, room_code, language, target_wins, max_attempts, word_length, current_round, status, created_by, winner_id, started_at, finished_at, round_starts_at, rematch_requested_user_ids",
      )
      .eq("room_code", roomCode)
      .maybeSingle();

    const nextRoom = room as BrowserRoomRow | null;

    if (!nextRoom) {
      return null;
    }

    const { data: players } = await letrix
      .from("multiplayer_room_players")
      .select(
        "user_id, slot, display_name, avatar_url, score, solved_current_round, attempts_used_current_round, masked_attempts",
      )
      .eq("room_id", nextRoom.id)
      .order("slot", { ascending: true });

    const nextPlayers = (players as BrowserPlayerRow[] | null) ?? [];
    const me = nextPlayers.find((player) => player.user_id === user.id);

    if (!me) {
      return null;
    }

    const opponent =
      nextPlayers.find((player) => player.user_id !== user.id) ?? null;
    const { data: privateState } = await letrix
      .from("multiplayer_room_private_states")
      .select("attempts")
      .eq("room_id", nextRoom.id)
      .eq("user_id", user.id)
      .maybeSingle();

    const nextPrivateState = privateState as BrowserPrivateStateRow | null;
    const rematchRequestedUserIds = Array.isArray(
      nextRoom.rematch_requested_user_ids,
    )
      ? nextRoom.rematch_requested_user_ids
      : [];

    return {
      roomId: nextRoom.id,
      roomCode: nextRoom.room_code,
      language: nextRoom.language,
      targetWins: nextRoom.target_wins,
      maxAttempts: nextRoom.max_attempts,
      wordLength: nextRoom.word_length,
      currentRound: nextRoom.current_round,
      status: nextRoom.status,
      createdBy: nextRoom.created_by,
      winnerId: nextRoom.winner_id,
      startedAt: nextRoom.started_at,
      finishedAt: nextRoom.finished_at,
      roundStartsAt: nextRoom.round_starts_at,
      rematchRequestedByMe: rematchRequestedUserIds.includes(user.id),
      rematchRequestedByOpponent: opponent
        ? rematchRequestedUserIds.includes(opponent.user_id)
        : false,
      me: {
        userId: me.user_id,
        slot: me.slot,
        displayName: me.display_name,
        avatarUrl: me.avatar_url,
        score: me.score,
        solvedCurrentRound: me.solved_current_round,
        attemptsUsedCurrentRound: me.attempts_used_current_round,
        maskedAttempts: Array.isArray(me.masked_attempts)
          ? me.masked_attempts
          : [],
        attempts: Array.isArray(nextPrivateState?.attempts)
          ? nextPrivateState.attempts
          : [],
      },
      opponent: opponent
        ? {
            userId: opponent.user_id,
            slot: opponent.slot,
            displayName: opponent.display_name,
            avatarUrl: opponent.avatar_url,
            score: opponent.score,
            solvedCurrentRound: opponent.solved_current_round,
            attemptsUsedCurrentRound: opponent.attempts_used_current_round,
            maskedAttempts: Array.isArray(opponent.masked_attempts)
              ? opponent.masked_attempts
              : [],
            attempts: [],
          }
        : null,
    } satisfies MultiplayerRoomSnapshot;
  }, [roomCode, user]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const isStaleSnapshot = useCallback(
    (nextSnapshot: MultiplayerRoomSnapshot) => {
      const currentSnapshot = snapshotRef.current;

      if (!currentSnapshot) {
        return false;
      }

      return (
        nextSnapshot.currentRound === currentSnapshot.currentRound &&
        nextSnapshot.me.score <= currentSnapshot.me.score &&
        nextSnapshot.me.attemptsUsedCurrentRound <
          currentSnapshot.me.attemptsUsedCurrentRound
      );
    },
    [],
  );

  const applySnapshot = useCallback(
    (nextSnapshot: MultiplayerRoomSnapshot) => {
      if (isStaleSnapshot(nextSnapshot)) {
        return;
      }

      if (isRevealLockedRef.current) {
        pendingSnapshotRef.current = nextSnapshot;
        return;
      }

      setSnapshot((currentSnapshot) => {
        if (currentSnapshot && currentSnapshot.roomId === nextSnapshot.roomId) {
          const previousOpponent = currentSnapshot.opponent;
          const nextOpponent = nextSnapshot.opponent;

          if (previousOpponent && nextOpponent) {
            const hasOpponentScored =
              nextOpponent.score > previousOpponent.score;
            const hasOpponentSolvedCurrentRound =
              !previousOpponent.solvedCurrentRound &&
              nextOpponent.solvedCurrentRound;

            if (hasOpponentScored || hasOpponentSolvedCurrentRound) {
              toast.success(`${nextOpponent.displayName} acertou!`);
            }
          }
        }

        return nextSnapshot;
      });
    },
    [isStaleSnapshot],
  );

  const loadRoom = useCallback(
    async (silent = false) => {
      if (!user) {
        return;
      }

      if (!silent) {
        setIsLoading(true);
        setError(null);
      }

      try {
        if (silent) {
          const browserSnapshot = await loadRoomFromBrowser();

          if (browserSnapshot) {
            applySnapshot(browserSnapshot);
            return;
          }
        }

        const nextSnapshot = await loadMultiplayerRoomRequest(roomCode);
        if (
          nextSnapshot &&
          (nextSnapshot.opponent || nextSnapshot.status !== "waiting")
        ) {
          applySnapshot(nextSnapshot);
          return;
        }

        const browserSnapshot = await loadRoomFromBrowser();

        if (browserSnapshot ?? nextSnapshot) {
          applySnapshot((browserSnapshot ?? nextSnapshot)!);
        }
      } catch (loadError) {
        const browserSnapshot = await loadRoomFromBrowser();

        if (browserSnapshot) {
          applySnapshot(browserSnapshot);
          return;
        }

        if (!silent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar a sala agora.",
          );
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [applySnapshot, loadRoomFromBrowser, roomCode, user],
  );

  const finishReveal = useCallback(
    (fallbackReload = false) => {
      if (revealTimeoutRef.current) {
        window.clearTimeout(revealTimeoutRef.current);
      }

      revealTimeoutRef.current = window.setTimeout(() => {
        isRevealLockedRef.current = false;
        setAnimatedAttempt(null);
        setBoardAnimation(null);

        if (pendingSnapshotRef.current) {
          const nextSnapshot = pendingSnapshotRef.current;
          pendingSnapshotRef.current = null;
          applySnapshot(nextSnapshot);
          return;
        }

        if (fallbackReload) {
          void loadRoom(true);
        }
      }, REVEAL_SETTLE_MS);
    },
    [applySnapshot, loadRoom],
  );

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user) {
      setError("Faça login para jogar online.");
      setIsLoading(false);
      return;
    }

    void loadRoom();
  }, [isAuthReady, loadRoom, user]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !snapshot?.roomId) {
      return;
    }

    const reload = () => {
      void loadRoom(true);
    };

    const channel = supabase
      .channel(`multiplayer-room-${snapshot.roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "letrix",
          table: "multiplayer_rooms",
          filter: `id=eq.${snapshot.roomId}`,
        },
        reload,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "letrix",
          table: "multiplayer_room_players",
          filter: `room_id=eq.${snapshot.roomId}`,
        },
        (payload) => {
          const row = payload.new as Partial<BrowserPlayerRow> & {
            user_id?: string;
          };

          if (!row.user_id) {
            reload();
            return;
          }

          let shouldReloadRoom = false;
          setSnapshot((previousSnapshot) => {
            if (
              !previousSnapshot ||
              previousSnapshot.roomId !== snapshot.roomId
            ) {
              return previousSnapshot;
            }

            if (row.user_id === previousSnapshot.me.userId) {
              return {
                ...previousSnapshot,
                me: {
                  ...previousSnapshot.me,
                  score: row.score ?? previousSnapshot.me.score,
                  solvedCurrentRound:
                    row.solved_current_round ??
                    previousSnapshot.me.solvedCurrentRound,
                  attemptsUsedCurrentRound:
                    row.attempts_used_current_round ??
                    previousSnapshot.me.attemptsUsedCurrentRound,
                  maskedAttempts: Array.isArray(row.masked_attempts)
                    ? row.masked_attempts
                    : previousSnapshot.me.maskedAttempts,
                },
              };
            }

            if (
              previousSnapshot.opponent &&
              row.user_id === previousSnapshot.opponent.userId
            ) {
              const hasOpponentScored =
                typeof row.score === "number" &&
                row.score > previousSnapshot.opponent.score;
              const hasOpponentSolvedCurrentRound =
                row.solved_current_round === true &&
                !previousSnapshot.opponent.solvedCurrentRound;

              if (hasOpponentScored || hasOpponentSolvedCurrentRound) {
                toast.success(
                  `${previousSnapshot.opponent.displayName} acertou a palavra!`,
                );
              }

              return {
                ...previousSnapshot,
                opponent: {
                  ...previousSnapshot.opponent,
                  score: row.score ?? previousSnapshot.opponent.score,
                  solvedCurrentRound:
                    row.solved_current_round ??
                    previousSnapshot.opponent.solvedCurrentRound,
                  attemptsUsedCurrentRound:
                    row.attempts_used_current_round ??
                    previousSnapshot.opponent.attemptsUsedCurrentRound,
                  maskedAttempts: Array.isArray(row.masked_attempts)
                    ? row.masked_attempts
                    : previousSnapshot.opponent.maskedAttempts,
                },
              };
            }

            if (
              !previousSnapshot.opponent &&
              row.user_id !== previousSnapshot.me.userId
            ) {
              toast.success(
                `${row.display_name ?? "Seu rival"} entrou na sala!`,
              );
              shouldReloadRoom = true;
            }

            return previousSnapshot;
          });

          if (shouldReloadRoom) {
            reload();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadRoom, snapshot?.roomId]);

  useEffect(() => {
    if (!snapshot || snapshot.status === "finished") {
      return;
    }

    const reload = () => {
      void loadRoom(true);
    };

    const poller = window.setInterval(reload, 4500);
    const handleFocus = () => reload();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reload();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(poller);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadRoom, snapshot]);

  useEffect(() => {
    setCurrentGuess("");
    setSelectedTileIndex(0);
  }, [snapshot?.currentRound]);

  useEffect(() => {
    if (!snapshot?.roundStartsAt) {
      setCountdownMs(0);
      return;
    }

    const target = new Date(snapshot.roundStartsAt).getTime();
    const updateCountdown = () => {
      setCountdownMs(Math.max(target - Date.now(), 0));
    };

    updateCountdown();

    if (target <= Date.now()) {
      return;
    }

    const timer = window.setInterval(updateCountdown, 150);
    return () => window.clearInterval(timer);
  }, [snapshot?.roundStartsAt]);

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) {
        window.clearTimeout(revealTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !snapshot ||
        snapshot.status !== "active" ||
        isSubmitting ||
        countdownMs > 0 ||
        isRevealLockedRef.current
      ) {
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        handleDeleteLetter();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void handleSubmitGuess();
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        handleTypeLetter(event.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [countdownMs, currentGuess, isSubmitting, snapshot]);

  const handleTypeLetter = (letter: string) => {
    if (
      !snapshot ||
      snapshot.status !== "active" ||
      countdownMs > 0 ||
      isRevealLockedRef.current
    ) {
      return;
    }

    const letters = currentGuess.padEnd(snapshot.wordLength, " ").split("");
    const targetIndex = Math.min(
      Math.max(selectedTileIndex, 0),
      snapshot.wordLength - 1,
    );

    letters[targetIndex] = letter;

    const nextEmptyAfterCurrent = letters.findIndex(
      (nextLetter, index) => index > targetIndex && !nextLetter.trim(),
    );
    const nextTileIndex =
      nextEmptyAfterCurrent !== -1 ? nextEmptyAfterCurrent : targetIndex;

    setCurrentGuess(letters.join("").trimEnd());
    setSelectedTileIndex(nextTileIndex);
  };

  const handleDeleteLetter = () => {
    if (!snapshot || isRevealLockedRef.current) {
      return;
    }

    const letters = currentGuess.padEnd(snapshot.wordLength, " ").split("");

    if (!letters.some((letter) => Boolean(letter.trim()))) {
      setSelectedTileIndex(0);
      return;
    }

    let targetIndex = Math.min(
      Math.max(selectedTileIndex, 0),
      snapshot.wordLength - 1,
    );

    if (!letters[targetIndex]?.trim()) {
      while (targetIndex > 0 && !letters[targetIndex]?.trim()) {
        targetIndex -= 1;
      }
    }

    if (!letters[targetIndex]?.trim()) {
      const fallbackIndex = letters.findLastIndex((letter) =>
        Boolean(letter.trim()),
      );
      targetIndex = fallbackIndex === -1 ? 0 : fallbackIndex;
    }

    letters[targetIndex] = "";
    setCurrentGuess(letters.join("").trimEnd());
    setSelectedTileIndex(targetIndex);
  };

  const handleSubmitGuess = useCallback(async () => {
    if (
      !snapshot ||
      snapshot.status !== "active" ||
      isSubmitting ||
      isRevealLockedRef.current
    ) {
      return;
    }

    if (countdownMs > 0) {
      toast.error("A próxima palavra já está chegando.");
      return;
    }

    if (currentGuess.length !== snapshot.wordLength) {
      toast.error(`Preencha as ${snapshot.wordLength} letras antes de enviar.`);
      return;
    }

    const guessToSubmit = currentGuess;
    setCurrentGuess("");
    setSelectedTileIndex(0);
    setIsSubmitting(true);

    try {
      const { snapshot: nextSnapshot, submission } =
        await submitMultiplayerGuessRequest({
          roomCode,
          guess: guessToSubmit,
        });

      const optimisticSnapshot: MultiplayerRoomSnapshot = {
        ...(snapshot as MultiplayerRoomSnapshot),
        status: submission.roomStatus,
        winnerId: submission.winnerId,
        roundStartsAt: submission.roundStartsAt,
        me: {
          ...snapshot.me,
          score: submission.score,
          solvedCurrentRound: submission.solvedCurrentRound,
        },
      };

      isRevealLockedRef.current = true;
      pendingSnapshotRef.current = nextSnapshot;
      setSnapshot(optimisticSnapshot);
      setAnimatedAttempt(submission.attempt);
      setBoardAnimation("revealing");
      finishReveal(!nextSnapshot);
    } catch (submitError) {
      setCurrentGuess(guessToSubmit);
      setSelectedTileIndex(Math.max(guessToSubmit.length - 1, 0));
      const multiplayerError = submitError as MultiplayerApiError;
      if (multiplayerError.code === "word-not-found") {
        toast.error("Essa palavra não existe no dicionário.");
      } else {
        toast.error(
          submitError instanceof Error
            ? submitError.message
            : "Não foi possível enviar a tentativa agora.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    countdownMs,
    currentGuess,
    finishReveal,
    isSubmitting,
    roomCode,
    snapshot,
  ]);

  const handleRequestRematch = async () => {
    if (!snapshot || isRequestingRematch) {
      return;
    }

    setIsRequestingRematch(true);

    try {
      const nextSnapshot = await requestMultiplayerRematchRequest(roomCode);

      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      }

      toast.success(
        nextSnapshot?.status === "active"
          ? "Revanche iniciada."
          : "Pedido de revanche enviado.",
      );
    } catch (rematchError) {
      toast.error(
        rematchError instanceof Error
          ? rematchError.message
          : "Não foi possível pedir revanche agora.",
      );
    } finally {
      setIsRequestingRematch(false);
    }
  };

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/${locale}/multiplayer/${roomCode}`;
  }, [locale, roomCode]);

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link da sala copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const keyboardLetterStates = useMemo(() => {
    const attempts = [...(snapshot?.me.attempts ?? [])];

    if (animatedAttempt) {
      attempts.push(animatedAttempt);
    }

    const statusesByLetter = new Map<string, Status>();

    for (const attempt of attempts) {
      const letters = attempt.guess.toUpperCase().split("");
      attempt.statuses.forEach((status, index) => {
        const letter = letters[index];

        if (!letter || !ALPHABET.includes(letter)) {
          return;
        }

        const previous = statusesByLetter.get(letter);

        if (
          !previous ||
          LETTER_STATUS_PRIORITY[status] > LETTER_STATUS_PRIORITY[previous]
        ) {
          statusesByLetter.set(letter, status);
        }
      });
    }

    return Object.fromEntries(
      ALPHABET.map((letter) => {
        const status = statusesByLetter.get(letter);
        const isAbsentOnly = status === "absent";

        return [
          letter,
          {
            status,
            disabled: isAbsentOnly,
          },
        ];
      }),
    );
  }, [animatedAttempt, snapshot?.me.attempts]);

  if (!isAuthReady || isLoading) {
    return (
      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        Carregando sala...
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-4">
        <div className="surface-panel-card p-5 text-sm text-muted-foreground">
          Faça login para jogar online.
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsSettingsModalOpen(true)}
        >
          Fazer login
        </Button>
      </section>
    );
  }

  if (error || !snapshot) {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-4">
        <div className="surface-panel-card p-5 text-sm text-muted-foreground">
          {error ?? "Não foi possível carregar a sala."}
        </div>
        <Button type="button" variant="outline" onClick={() => void loadRoom()}>
          <RefreshCcw className="mr-2 size-4" />
          Tentar novamente
        </Button>
      </section>
    );
  }

  const isWaiting = snapshot.status === "waiting";
  const isFinished = snapshot.status === "finished";
  const isBetweenRounds =
    snapshot.status === "active" && countdownMs > 0 && !isWaiting;
  const winner =
    snapshot.winnerId === snapshot.me.userId
      ? snapshot.me
      : snapshot.opponent && snapshot.winnerId === snapshot.opponent.userId
        ? snapshot.opponent
        : null;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-2 py-2 md:px-4">
      <header className="surface-panel relative overflow-hidden p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_36%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.1),transparent_32%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Sala {snapshot.roomCode}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Multiplayer Letrix
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Rodada {snapshot.currentRound} • meta de {snapshot.targetWins}{" "}
              palavras
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={handleCopyInvite}>
              <Copy className="mr-2 size-4" />
              Copiar convite
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${locale}/multiplayer`)}
            >
              Voltar
            </Button>
            {isFinished ? (
              <Button
                type="button"
                onClick={() => void handleRequestRematch()}
                disabled={isRequestingRematch}
              >
                <RotateCcw className="mr-2 size-4" />
                {snapshot.rematchRequestedByMe
                  ? "Revanche solicitada"
                  : "Pedir revanche"}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <div className="surface-panel relative overflow-hidden p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_42%)]" />
            <div className="relative text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Você
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {snapshot.me.displayName}
              </p>
            </div>
          </div>

          <div className="surface-panel flex min-w-[120px] items-center justify-center p-4">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                versus
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
                {snapshot.me.score} × {snapshot.opponent?.score ?? 0}
              </p>
            </div>
          </div>

          <div className="surface-panel relative overflow-hidden p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.12),transparent_42%)]" />
            <div className="relative text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Oponente
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {snapshot.opponent?.displayName ?? "Aguardando rival"}
              </p>
              {!snapshot.opponent ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Compartilhe o link da sala
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {isWaiting ? (
          <div className="surface-panel-card relative overflow-hidden p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.12),transparent_45%)]" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Aguardando a segunda pessoa entrar
                </p>
                <p className="text-xs text-muted-foreground">
                  Assim que alguém entrar, a disputa começa automaticamente.
                </p>
              </div>
              <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Em espera
              </div>
            </div>
          </div>
        ) : null}

        {isFinished ? (
          <div className="surface-panel-card flex items-center gap-3 p-4">
            <Crown className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {winner
                  ? `${winner.displayName} venceu a disputa.`
                  : "A disputa terminou."}
              </p>
              <p className="text-xs text-muted-foreground">
                {snapshot.rematchRequestedByMe &&
                !snapshot.rematchRequestedByOpponent
                  ? "Aguardando o outro jogador aceitar a revanche."
                  : "Você pode pedir revanche ou voltar ao lobby."}
              </p>
            </div>
          </div>
        ) : null}

        {isBetweenRounds ? (
          <div className="surface-panel-card flex items-center gap-3 p-4">
            <RefreshCcw className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Próxima palavra em {Math.max(Math.ceil(countdownMs / 1000), 1)}s
              </p>
              <p className="text-xs text-muted-foreground">
                A sala avança junta para a próxima rodada.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid justify-items-center gap-4 xl:grid-cols-2">
          <MultiplayerBoard
            title="Seu tabuleiro"
            subtitle={`${snapshot.me.attempts.length}/${snapshot.maxAttempts} tentativas na rodada`}
            attempts={snapshot.me.attempts}
            animatedAttempt={animatedAttempt}
            animation={boardAnimation}
            currentGuess={currentGuess}
            selectedTileIndex={selectedTileIndex}
            onSelectTile={handleSelectTile}
            isInteractive={!isWaiting && !isFinished && !isBetweenRounds}
            maxAttempts={snapshot.maxAttempts}
            wordLength={snapshot.wordLength}
          />

          <MultiplayerBoard
            title={snapshot.opponent?.displayName ?? "Oponente"}
            subtitle={
              snapshot.opponent
                ? `${snapshot.opponent.maskedAttempts.length}/${snapshot.maxAttempts} tentativas na rodada`
                : "Ainda não entrou na sala"
            }
            attempts={snapshot.opponent?.maskedAttempts ?? []}
            maskLetters
            maxAttempts={snapshot.maxAttempts}
            wordLength={snapshot.wordLength}
          />
        </div>

        <MultiplayerKeyboard
          disabled={
            isWaiting ||
            isFinished ||
            isSubmitting ||
            isBetweenRounds ||
            Boolean(boardAnimation)
          }
          letterStates={keyboardLetterStates}
          onType={handleTypeLetter}
          onDelete={handleDeleteLetter}
          onEnter={() => {
            void handleSubmitGuess();
          }}
        />
      </div>
    </section>
  );
}
