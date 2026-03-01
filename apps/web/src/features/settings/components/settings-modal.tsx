"use client";

import { useCallback, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Contrast,
  Lock,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sun,
  UserRound,
} from "lucide-react";
import { FaDiscord } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { gameSettings } from "@/config/game";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFadeUpMotion, staggerDelay } from "@/config/motion-variants";
import {
  getUserAvatarUrl,
  getUserDisplayName,
  getUserInitials,
} from "@/features/auth/lib/user-profile";
import { useGame } from "@/contexts/GameContext";
import { useApp } from "@/contexts/AppContext";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  alertsCopy,
  getHighContrastStatusMessage,
  settingsCopy,
} from "@/lib/copy";
import { Base } from "@/features/shared/components/dialog-base";

type Props = {
  isOpen: boolean;
  disableHardModeOption: boolean;
  handleClose: () => void;
};

type SettingCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  control: ReactNode;
};

const SettingCard = ({
  icon: Icon,
  title,
  description,
  control,
}: SettingCardProps) => (
  <section className="surface-panel p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="surface-icon mt-0.5">
          <Icon className="size-4 text-foreground/85" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  </section>
);

export const SettingsModal = ({
  isOpen,
  handleClose,
  disableHardModeOption,
}: Props) => {
  const { setTheme, theme } = useTheme();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const {
    storage,
    saveConfig,
    user,
    isAuthReady,
    signInWithMagicLink,
    signInWithOAuth,
    signOut,
  } = useApp();
  const { gameMode, guesses } = useGame();
  const isSingleWordMode = gameSettings[gameMode].boards === 1;
  const [email, setEmail] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const userDisplayName = getUserDisplayName(user);
  const userAvatarUrl = getUserAvatarUrl(user);
  const userInitials = getUserInitials(user);

  const handleHardMode = useCallback(
    (isHard: boolean) => {
      if (guesses.length === 0 || storage?.hardMode) {
        saveConfig({ hardMode: isHard });
      } else {
        toast.error(alertsCopy.hardModeEnabled);
      }
    },
    [guesses.length, saveConfig, storage?.hardMode],
  );

  const handleHighContrastMode = useCallback(
    (isHighContrast: boolean) => {
      saveConfig({ highContrast: isHighContrast });
      toast.message(getHighContrastStatusMessage(isHighContrast));
    },
    [saveConfig],
  );

  const handleMagicLinkSignIn = useCallback(async () => {
    if (!email.trim()) {
      toast.error("Informe seu e-mail para continuar.");
      return;
    }

    setIsAuthLoading(true);
    const result = await signInWithMagicLink(email.trim());
    setIsAuthLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Link de login enviado. Confira seu e-mail.");
  }, [email, signInWithMagicLink]);

  const handleSignOut = useCallback(async () => {
    setIsAuthLoading(true);
    await signOut();
    setIsAuthLoading(false);
    toast.success("Sessão encerrada.");
  }, [signOut]);

  const handleOAuthSignIn = useCallback(
    async (provider: "google" | "discord") => {
      setIsAuthLoading(true);
      const result = await signInWithOAuth(provider);
      setIsAuthLoading(false);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.message(
        `Redirecionando para login ${provider === "google" ? "Google" : "Discord"}...`,
      );
    },
    [signInWithOAuth],
  );

  return (
    <Base
      title={settingsCopy.title}
      isOpen={isOpen}
      showHeader
      handleClose={handleClose}
      className="max-w-2xl"
      buttons={[
        {
          label: settingsCopy.resetSavedData,
          name: "reset",
          variant: { variant: "destructive" },
          action: () => {
            localStorage.clear();
            toast.info(settingsCopy.resetSavedDataDone);
          },
        },
      ]}
    >
      <div className="space-y-4">
        <motion.div
          className="surface-panel-subtle p-4"
          {...createFadeUpMotion({
            distance: 10,
            reducedMotion: shouldReduceMotion,
          })}
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Palette className="size-4" />
            Personalize sua experiência
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Essas opções alteram apenas este dispositivo.
          </p>
        </motion.div>

        <motion.div
          className="space-y-3"
          {...createFadeUpMotion({
            distance: 10,
            delay: staggerDelay(1, 0.04, 0.18),
            reducedMotion: shouldReduceMotion,
          })}
        >
          {isSingleWordMode && (
            <SettingCard
              icon={Lock}
              title={settingsCopy.hardMode}
              description={settingsCopy.hardModeDescription}
              control={
                <Switch
                  checked={storage?.hardMode}
                  onCheckedChange={handleHardMode}
                  disabled={disableHardModeOption}
                />
              }
            />
          )}

          <SettingCard
            icon={Contrast}
            title={settingsCopy.highContrast}
            description="Realça as cores das peças e teclas para facilitar leitura."
            control={
              <Switch
                checked={storage?.highContrast}
                onCheckedChange={handleHighContrastMode}
              />
            }
          />

          <SettingCard
            icon={Monitor}
            title={settingsCopy.theme}
            description="Escolha aparência clara, escura ou automática."
            control={
              <ToggleGroup
                type="single"
                value={theme ?? "system"}
                onValueChange={(value) => {
                  if (value) setTheme(value);
                }}
              >
                <ToggleGroupItem value="light" aria-label="Tema claro">
                  <Sun className="size-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="system" aria-label="Tema do sistema">
                  <Monitor className="size-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" aria-label="Tema escuro">
                  <Moon className="size-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            }
          />

          <section className="surface-panel p-4">
            <div className="flex items-start gap-3">
              <div className="surface-icon mt-0.5">
                <UserRound className="size-4 text-foreground/85" />
              </div>
              <div className="w-full space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Conta
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Entre para sincronizar estatísticas e progresso em vários
                    dispositivos.
                  </p>
                </div>

                {!isAuthReady ? (
                  <p className="text-sm text-muted-foreground">
                    Verificando sessão...
                  </p>
                ) : user ? (
                  <div className="surface-panel-subtle flex flex-col gap-3 rounded-xl p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-12 border-primary/20 bg-primary/10">
                          {userAvatarUrl ? (
                            <AvatarImage
                              src={userAvatarUrl}
                              alt={`Avatar de ${userDisplayName}`}
                            />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {userDisplayName}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {user.email ?? "Usuário autenticado"}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSignOut}
                        disabled={isAuthLoading}
                      >
                        <LogOut className="size-4" />
                        Sair
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="voce@email.com"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleMagicLinkSignIn}
                      disabled={isAuthLoading}
                    >
                      <LogIn className="size-4" />
                      Entrar com magic link
                    </Button>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleOAuthSignIn("google")}
                        disabled={isAuthLoading}
                        className="h-10 justify-start gap-2 border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 hover:bg-white dark:border-slate-500 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-100"
                      >
                        <FcGoogle className="size-5" />
                        Entrar com Google
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleOAuthSignIn("discord")}
                        disabled={isAuthLoading}
                        className="h-10 justify-start gap-2 border border-[#5865F2] bg-[#5865F2] text-white shadow-sm hover:border-[#4752c4] hover:bg-[#4752c4] dark:border-[#5865F2] dark:bg-[#5865F2] dark:hover:border-[#4752c4] dark:hover:bg-[#4752c4]"
                      >
                        <FaDiscord className="size-4" />
                        Entrar com Discord
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </Base>
  );
};
