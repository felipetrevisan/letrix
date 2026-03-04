"use client";

import {
  Activity,
  BarChart3,
  RefreshCcw,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/contexts/AppContext";
import { getSupabaseBrowserClient } from "@/features/auth/lib/supabase-client";
import type { AdminDashboardData } from "@/features/admin/lib/admin-analytics";
import { getUserInitials } from "@/features/auth/lib/user-profile";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
};

type MetricCardProps = {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Sem atividade";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("pt-BR").format(value);
};

function MetricCard({ icon: Icon, label, value, hint }: MetricCardProps) {
  return (
    <div className="surface-panel-card flex min-h-28 flex-col justify-between p-4">
      <div className="flex items-center gap-3">
        <span className="surface-icon text-primary">
          <Icon className="size-4" />
        </span>
        <p className="text-sm font-medium text-foreground/72">{label}</p>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export function AdminDashboard({ locale }: Props) {
  const { user, isAuthReady } = useApp();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Painel indisponível no momento.");
      setData(null);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Faça login para acessar o painel.");
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/overview", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        data?: AdminDashboardData;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Não foi possível carregar o painel.");
      }

      setData(payload.data);
    } catch (requestError) {
      setData(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível carregar o painel.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user) {
      setData(null);
      setError("Faça login para acessar o painel.");
      return;
    }

    void loadDashboard();
  }, [isAuthReady, loadDashboard, user]);

  const generatedAtLabel = useMemo(() => {
    if (!data?.generatedAt) {
      return null;
    }

    return formatDateTime(data.generatedAt);
  }, [data?.generatedAt]);

  return (
    <section className="mx-auto flex min-h-full w-full max-w-7xl flex-1 flex-col gap-4 overflow-y-auto pb-4 pt-2 xl:overflow-hidden">
      <header className="surface-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Shield className="size-3.5" />
            Admin
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Painel de uso
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Visão geral de jogadores ativos, uso por modo e ranking global do
              Letrix.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/1`}>Voltar ao jogo</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void loadDashboard();
            }}
            disabled={isLoading || !user}
          >
            <RefreshCcw
              className={cn("mr-2 size-4", isLoading && "animate-spin")}
            />
            Atualizar
          </Button>
        </div>
      </header>

      {!isAuthReady || isLoading ? (
        <div className="surface-panel-card flex min-h-52 items-center justify-center p-6 text-sm text-muted-foreground">
          Carregando painel...
        </div>
      ) : error ? (
        <div className="surface-panel-card flex min-h-52 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          {user ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void loadDashboard();
              }}
            >
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={Users}
              label="Jogadores totais"
              value={formatNumber(data.overview.totalPlayers)}
            />
            <MetricCard
              icon={Activity}
              label="Ativos em 24h"
              value={formatNumber(data.overview.activePlayers24h)}
            />
            <MetricCard
              icon={Activity}
              label="Ativos em 7 dias"
              value={formatNumber(data.overview.activePlayers7d)}
            />
            <MetricCard
              icon={BarChart3}
              label="Partidas registradas"
              value={formatNumber(data.overview.recordedGames)}
            />
            <MetricCard
              icon={Trophy}
              label="Vitórias registradas"
              value={formatNumber(data.overview.recordedWins)}
              hint={
                generatedAtLabel
                  ? `Atualizado em ${generatedAtLabel}`
                  : undefined
              }
            />
          </div>

          <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="surface-panel flex flex-col p-4 xl:min-h-0 xl:overflow-hidden">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Modos mais jogados
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Total acumulado a partir das estatísticas sincronizadas dos
                    jogadores.
                  </p>
                </div>
              </div>

              <ScrollArea className="pr-3 xl:min-h-0 xl:flex-1">
                <div className="grid gap-3">
                  {data.modeUsage.map((mode) => (
                    <div
                      key={mode.modeName}
                      className="surface-panel-card grid gap-3 p-4 md:grid-cols-[minmax(0,1.2fr)_repeat(5,minmax(0,0.7fr))]"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-foreground">
                          {mode.modeLabel}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Última atividade: {formatDateTime(mode.lastPlayedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          Jogadores
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {formatNumber(mode.players)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          Ativos 24h
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {formatNumber(mode.activePlayers24h)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          Partidas
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {formatNumber(mode.games)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          Vitórias
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {formatNumber(mode.wins)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          Taxa
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {mode.winRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </section>

            <section className="surface-panel flex flex-col p-4 xl:min-h-0 xl:overflow-hidden">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Ranking global
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ordenado por vitórias totais, com desempate por taxa de acerto
                  e volume de partidas.
                </p>
              </div>

              <ScrollArea className="pr-3 xl:min-h-0 xl:flex-1">
                <div className="grid gap-3">
                  {data.ranking.map((entry) => (
                    <div
                      key={entry.userId}
                      className="surface-panel-card flex items-center gap-3 p-4"
                    >
                      <div className="surface-icon flex size-10 items-center justify-center p-0 text-sm font-semibold text-primary">
                        #{entry.rank}
                      </div>
                      <Avatar className="size-11 border border-border/60">
                        {entry.avatarUrl ? (
                          <AvatarImage
                            src={entry.avatarUrl}
                            alt={`Avatar de ${entry.displayName}`}
                          />
                        ) : null}
                        <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                          {getUserInitials({
                            email: entry.email ?? undefined,
                            user_metadata: { full_name: entry.displayName },
                          } as any)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {entry.displayName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.email ?? "Sem e-mail visível"}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Última atividade: {formatDateTime(entry.lastSeenAt)}
                        </p>
                      </div>
                      <div className="grid shrink-0 gap-1 text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatNumber(entry.wins)} vitórias
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(entry.games)} partidas
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.winRate.toFixed(1)}% taxa
                        </p>
                        <p className="text-xs text-muted-foreground">
                          streak máx. {formatNumber(entry.maxStreak)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
