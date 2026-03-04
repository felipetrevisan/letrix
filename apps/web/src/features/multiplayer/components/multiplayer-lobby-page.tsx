"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useApp } from "@/contexts/AppContext";
import {
  createMultiplayerRoomRequest,
  joinMultiplayerRoomRequest,
} from "@/features/multiplayer/lib/client";

type Props = {
  locale: string;
};

export function MultiplayerLobbyPage({ locale }: Props) {
  const router = useRouter();
  const { isAuthReady, user, setIsSettingsModalOpen } = useApp();
  const [roomCode, setRoomCode] = useState("");
  const [targetWins, setTargetWins] = useState("3");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!user) {
      setIsSettingsModalOpen(true);
      return;
    }

    setIsLoading(true);

    try {
      const nextRoomCode = await createMultiplayerRoomRequest({
        locale,
        targetWins: Number(targetWins),
      });

      router.push(`/${locale}/multiplayer/${nextRoomCode}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a sala agora.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!user) {
      setIsSettingsModalOpen(true);
      return;
    }

    if (!roomCode.trim()) {
      toast.error("Informe o código da sala.");
      return;
    }

    setIsLoading(true);

    try {
      const joinedRoomCode = await joinMultiplayerRoomRequest(roomCode);
      router.push(`/${locale}/multiplayer/${joinedRoomCode}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível entrar na sala agora.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-2 py-2 md:px-4">
      <header className="surface-panel relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_32%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.1),transparent_36%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Multiplayer
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Jogue online em tempo real
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Crie uma sala, convide outra pessoa e disputem a mesma sequência de
            palavras. Ganha quem atingir a meta primeiro.
          </p>
        </div>
      </header>

      {!isAuthReady ? (
        <div className="surface-panel-card p-6 text-sm text-muted-foreground">
          Carregando...
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="surface-panel relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_40%)]" />
          <div className="relative flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Criar sala
              </h2>
              <p className="text-sm text-muted-foreground">
                Escolha a meta de vitórias e gere um código para convidar
                alguém.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Meta de palavras
              </p>
              <ToggleGroup
                type="single"
                value={targetWins}
                onValueChange={(value) => value && setTargetWins(value)}
                className="justify-start"
              >
                <ToggleGroupItem value="3">3</ToggleGroupItem>
                <ToggleGroupItem value="5">5</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Button
              type="button"
              onClick={() => void handleCreateRoom()}
              disabled={isLoading}
            >
              Criar sala
            </Button>
          </div>
        </article>

        <article className="surface-panel relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.12),transparent_40%)]" />
          <div className="relative flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Entrar em sala
              </h2>
              <p className="text-sm text-muted-foreground">
                Cole o código enviado pela outra pessoa.
              </p>
            </div>

            <Input
              value={roomCode}
              onChange={(event) =>
                setRoomCode(event.target.value.toUpperCase())
              }
              placeholder="ABC123"
              maxLength={6}
              className="font-mono uppercase tracking-[0.3em]"
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => void handleJoinRoom()}
              disabled={isLoading}
            >
              Entrar na sala
            </Button>
          </div>
        </article>
      </div>

      {!user && isAuthReady ? (
        <div className="surface-panel-card flex flex-col gap-3 p-5">
          <p className="text-sm text-muted-foreground">
            Você precisa estar logado para criar ou entrar em uma sala online.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSettingsModalOpen(true)}
          >
            Fazer login
          </Button>
        </div>
      ) : null}
    </section>
  );
}
