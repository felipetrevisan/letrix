"use client";

import { Copy, Crown, RefreshCcw, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import {
  getLetrixBrowserClient,
  getSupabaseBrowserClient,
} from "@/features/auth/lib/supabase-client";
import { MultiplayerBoard } from "@/features/multiplayer/components/multiplayer-board";
import { MultiplayerKeyboard } from "@/features/multiplayer/components/multiplayer-keyboard";
import {
  loadMultiplayerRoomRequest,
  requestMultiplayerRematchRequest,
  submitMultiplayerGuessRequest,
} from "@/features/multiplayer/lib/client";
import type { MultiplayerRoomSnapshot } from "@/features/multiplayer/lib/types";

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

const insertLetter = (guess: string, index: number, letter: string) => {
  const letters = guess.padEnd(5, " ").split("");
  letters[index] = letter;
  return letters.join("").trimEnd();
};

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

  const handleSelectTile = (index: number) => {
    const maxSelectableIndex = Math.min(currentGuess.length, 4);
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
        const nextSnapshot = await loadMultiplayerRoomRequest(roomCode);
        if (
          nextSnapshot &&
          (nextSnapshot.opponent || nextSnapshot.status !== "waiting")
        ) {
          setSnapshot(nextSnapshot);
          return;
        }

        const browserSnapshot = await loadRoomFromBrowser();
        setSnapshot(browserSnapshot ?? nextSnapshot);
      } catch (loadError) {
        const browserSnapshot = await loadRoomFromBrowser();

        if (browserSnapshot) {
          setSnapshot(browserSnapshot);
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
    [loadRoomFromBrowser, roomCode, user],
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
        reload,
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

    const poller = window.setInterval(reload, 2000);
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !snapshot ||
        snapshot.status !== "active" ||
        isSubmitting ||
        countdownMs > 0
      ) {
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setCurrentGuess((prev) => prev.slice(0, -1));
        setSelectedTileIndex((prev) => Math.max(prev - 1, 0));
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
      currentGuess.length >= snapshot.wordLength ||
      countdownMs > 0
    ) {
      return;
    }

    setCurrentGuess((prev) => insertLetter(prev, selectedTileIndex, letter));
    setSelectedTileIndex((prev) => Math.min(prev + 1, snapshot.wordLength - 1));
  };

  const handleDeleteLetter = () => {
    if (!currentGuess.length) {
      return;
    }

    setCurrentGuess((prev) => prev.slice(0, -1));
    setSelectedTileIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmitGuess = useCallback(async () => {
    if (!snapshot || snapshot.status !== "active" || isSubmitting) {
      return;
    }

    if (countdownMs > 0) {
      toast.error("A próxima palavra já está chegando.");
      return;
    }

    setIsSubmitting(true);

    try {
      const nextSnapshot = await submitMultiplayerGuessRequest({
        roomCode,
        guess: currentGuess,
      });

      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      }

      setCurrentGuess("");
      setSelectedTileIndex(0);
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível enviar a tentativa agora.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [countdownMs, currentGuess, isSubmitting, roomCode, snapshot]);

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
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {snapshot.me.displayName}
                </p>
                <p className="text-xs text-muted-foreground">Você</p>
              </div>
              <p className="text-3xl font-semibold tabular-nums text-foreground">
                {snapshot.me.score}
              </p>
            </div>
          </div>

          <div className="surface-panel hidden min-w-[120px] items-center justify-center p-4 lg:flex">
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
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {snapshot.opponent?.displayName ?? "Aguardando rival"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {snapshot.opponent
                    ? "Oponente"
                    : "Compartilhe o link da sala"}
                </p>
              </div>
              <p className="text-3xl font-semibold tabular-nums text-foreground">
                {snapshot.opponent?.score ?? 0}
              </p>
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
          disabled={isWaiting || isFinished || isSubmitting || isBetweenRounds}
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
