"use client";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Grid2x2,
  LayoutPanelTop,
  LoaderCircle,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Infinity,
  Settings,
  Square,
  Sun,
  Type,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { MotionHighlight } from "@/components/animate-ui/primitives/motion-highlight";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const modeItems = [
  { value: "1", label: "Termo", icon: Square },
  { value: "2", label: "Dueto", icon: LayoutPanelTop },
  { value: "3", label: "Trieto", icon: Grid2x2 },
  { value: "4", label: "Quarteto", icon: BarChart3 },
  { value: "5", label: "Deca", icon: Type },
  { value: "6", label: "Infinito", icon: Infinity },
] as const;

const brandTail = ["E", "T", "R", "I", "X"] as const;

const brandVariants = {
  collapsed: {
    width: 40,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  },
  expanded: {
    width: 132,
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1] as const,
      when: "beforeChildren" as const,
      delayChildren: 0.08,
      staggerChildren: 0.05,
    },
  },
};

const brandLetterVariants = {
  collapsed: {
    opacity: 0,
    y: 4,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] as const },
  },
  expanded: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const brandWordVariants = {
  collapsed: {
    opacity: 0,
    x: -6,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as const },
  },
  expanded: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1] as const,
      delayChildren: 0.1,
      staggerChildren: 0.05,
    },
  },
};

const iconButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/65 bg-background text-foreground transition hover:border-primary/70 hover:bg-muted hover:text-foreground";

type ActionButtonsProps = {
  expanded: boolean;
  closeAfterAction?: boolean;
  layoutId: string;
};

type SidebarTooltipProps = {
  label: string;
  disabled?: boolean;
  children: ReactNode;
};

function SidebarTooltip({
  label,
  disabled = false,
  children,
}: SidebarTooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function ActionButtons({
  expanded,
  closeAfterAction = false,
  layoutId,
}: ActionButtonsProps) {
  const {
    setIsInfoModalOpen,
    setIsSettingsModalOpen,
    setIsStatsModalOpen,
    isAuthReady,
    user,
    signOut,
    closeMenu,
  } = useApp();
  const { setTheme, theme } = useTheme();
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);
  const isDark = theme === "dark";

  const run = (fn: () => void) => {
    fn();
    if (closeAfterAction) closeMenu();
  };

  const actionClass = cn(
    "relative isolate inline-flex h-10 items-center overflow-hidden rounded-lg border border-border/65 bg-background text-foreground hover:border-primary/70 hover:bg-transparent hover:text-foreground",
    "transition-[width,padding,gap] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
    expanded
      ? "w-full justify-start gap-2 px-3 text-sm font-medium"
      : "w-10 justify-center px-0",
  );
  const actionIconClass = expanded
    ? "relative z-10 size-4"
    : "relative z-10 size-5";
  const authButtonClass = cn(
    actionClass,
    user
      ? "border-emerald-500/45 bg-emerald-500/12 text-emerald-700 hover:border-emerald-500/70 hover:text-emerald-700 dark:text-emerald-300"
      : "border-cyan-500/45 bg-cyan-500/12 text-cyan-700 hover:border-cyan-500/70 hover:text-cyan-700 dark:text-cyan-300",
  );

  const withCollapsedTooltip = (label: string, element: ReactNode) => {
    return (
      <SidebarTooltip label={label} disabled={expanded}>
        {element}
      </SidebarTooltip>
    );
  };

  const renderActionLabel = (label: string) => (
    <motion.span
      className="relative z-10 inline-block overflow-hidden whitespace-nowrap"
      initial={false}
      animate={
        expanded
          ? { opacity: 1, x: 0, maxWidth: 160 }
          : { opacity: 0, x: -6, maxWidth: 0 }
      }
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {label}
    </motion.span>
  );

  const handleAuthAction = async () => {
    if (!isAuthReady || isAuthActionLoading) {
      return;
    }

    if (!user) {
      run(() => setIsSettingsModalOpen(true));
      return;
    }

    setIsAuthActionLoading(true);
    await signOut();
    setIsAuthActionLoading(false);
    toast.success("Sessão encerrada.");
    if (closeAfterAction) {
      closeMenu();
    }
  };

  return (
    <>
      {withCollapsedTooltip(
        "Como jogar",
        <Button
          type="button"
          variant="ghost"
          className={actionClass}
          title="Como jogar"
          aria-label="Como jogar"
          onClick={() => run(() => setIsInfoModalOpen(true))}
          onMouseEnter={() => setHoveredAction("info")}
          onMouseLeave={() => setHoveredAction(null)}
        >
          <MotionHighlight
            active={hoveredAction === "info"}
            layoutId={layoutId}
            className="z-0 rounded-[inherit] border border-primary/65 bg-primary/12 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
          />
          <CircleHelp className={actionIconClass} />
          {renderActionLabel("Como jogar")}
        </Button>,
      )}
      {withCollapsedTooltip(
        "Estatísticas",
        <Button
          type="button"
          variant="ghost"
          className={actionClass}
          title="Estatísticas"
          aria-label="Estatísticas"
          onClick={() => run(() => setIsStatsModalOpen(true))}
          onMouseEnter={() => setHoveredAction("stats")}
          onMouseLeave={() => setHoveredAction(null)}
        >
          <MotionHighlight
            active={hoveredAction === "stats"}
            layoutId={layoutId}
            className="z-0 rounded-[inherit] border border-primary/65 bg-primary/12 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
          />
          <BarChart3 className={actionIconClass} />
          {renderActionLabel("Estatísticas")}
        </Button>,
      )}
      {withCollapsedTooltip(
        "Configurações",
        <Button
          type="button"
          variant="ghost"
          className={actionClass}
          title="Configurações"
          aria-label="Configurações"
          onClick={() => run(() => setIsSettingsModalOpen(true))}
          onMouseEnter={() => setHoveredAction("settings")}
          onMouseLeave={() => setHoveredAction(null)}
        >
          <MotionHighlight
            active={hoveredAction === "settings"}
            layoutId={layoutId}
            className="z-0 rounded-[inherit] border border-primary/65 bg-primary/12 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
          />
          <Settings className={actionIconClass} />
          {renderActionLabel("Configurações")}
        </Button>,
      )}
      {withCollapsedTooltip(
        isDark ? "Tema claro" : "Tema escuro",
        <Button
          type="button"
          variant="ghost"
          className={actionClass}
          title={isDark ? "Tema claro" : "Tema escuro"}
          aria-label={isDark ? "Tema claro" : "Tema escuro"}
          onClick={() => run(() => setTheme(isDark ? "light" : "dark"))}
          onMouseEnter={() => setHoveredAction("theme")}
          onMouseLeave={() => setHoveredAction(null)}
        >
          <MotionHighlight
            active={hoveredAction === "theme"}
            layoutId={layoutId}
            className="z-0 rounded-[inherit] border border-primary/65 bg-primary/12 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
          />
          {isDark ? (
            <Sun className={actionIconClass} />
          ) : (
            <Moon className={actionIconClass} />
          )}
          {renderActionLabel(isDark ? "Tema claro" : "Tema escuro")}
        </Button>,
      )}
      {withCollapsedTooltip(
        user ? "Sair da conta" : "Entrar na conta",
        <Button
          type="button"
          variant="ghost"
          className={authButtonClass}
          title={user ? "Sair da conta" : "Entrar na conta"}
          aria-label={user ? "Sair da conta" : "Entrar na conta"}
          onClick={() => {
            void handleAuthAction();
          }}
          onMouseEnter={() => setHoveredAction("auth")}
          onMouseLeave={() => setHoveredAction(null)}
          disabled={!isAuthReady || isAuthActionLoading}
        >
          <MotionHighlight
            active={hoveredAction === "auth"}
            layoutId={layoutId}
            className="z-0 rounded-[inherit] border border-primary/65 bg-primary/12 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
          />
          {!isAuthReady || isAuthActionLoading ? (
            <LoaderCircle className={cn(actionIconClass, "animate-spin")} />
          ) : user ? (
            <LogOut className={actionIconClass} />
          ) : (
            <LogIn className={actionIconClass} />
          )}
          {renderActionLabel(user ? "Sair" : "Login")}
        </Button>,
      )}
    </>
  );
}

export function Header() {
  const { isMenuOpen, openMenu, closeMenu, isSidebarExpanded, toggleSidebar } =
    useApp();
  const { gameMode } = useGame();
  const [hoveredModeDesktop, setHoveredModeDesktop] = useState<string | null>(
    null,
  );
  const [hoveredModeMobile, setHoveredModeMobile] = useState<string | null>(
    null,
  );
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] ?? "pt";

  return (
    <TooltipProvider delayDuration={120}>
      <motion.aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border/60 bg-background/95 lg:flex",
        )}
        initial={false}
        animate={{ width: isSidebarExpanded ? 256 : 80 }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex h-full min-h-0 w-full flex-col py-3">
          <div
            className={cn(
              "relative flex min-h-10 items-center justify-center",
              isSidebarExpanded ? "px-3" : "px-2",
            )}
          >
            <SidebarTooltip label="Início" disabled={isSidebarExpanded}>
              <Link
                href={`/${locale}/1`}
                title="Início"
                className="title inline-flex h-10 items-center justify-center rounded-lg border border-border/65 bg-background text-foreground/90"
              >
                <motion.span
                  className="relative inline-flex h-full items-center overflow-hidden whitespace-nowrap"
                  initial={false}
                  variants={brandVariants}
                  animate={isSidebarExpanded ? "expanded" : "collapsed"}
                >
                  <motion.span
                    className="absolute inset-0 inline-flex h-full w-10 items-center justify-center text-center text-xl leading-none tracking-normal"
                    initial={false}
                    animate={
                      isSidebarExpanded ? { opacity: 0 } : { opacity: 1 }
                    }
                    transition={{ duration: 0.16, ease: [0.4, 0, 1, 1] }}
                  >
                    L
                  </motion.span>
                  <motion.span
                    className="inline-flex h-full items-center pr-3 text-lg leading-none tracking-[0.14em]"
                    initial={false}
                    variants={brandWordVariants}
                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                  >
                    <span className="inline-flex h-full w-10 items-center justify-center text-center text-xl leading-none tracking-normal">
                      L
                    </span>
                    {brandTail.map((letter) => (
                      <motion.span key={letter} variants={brandLetterVariants}>
                        {letter}
                      </motion.span>
                    ))}
                  </motion.span>
                </motion.span>
              </Link>
            </SidebarTooltip>
            <SidebarTooltip
              label={isSidebarExpanded ? "Retrair sidebar" : "Expandir sidebar"}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  iconButtonClass,
                  "absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2",
                )}
                onClick={toggleSidebar}
                aria-label={
                  isSidebarExpanded ? "Retrair sidebar" : "Expandir sidebar"
                }
                title={
                  isSidebarExpanded ? "Retrair sidebar" : "Expandir sidebar"
                }
              >
                {isSidebarExpanded ? (
                  <ChevronLeft className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </Button>
            </SidebarTooltip>
          </div>

          <nav
            className={cn(
              "mt-4 grid gap-2",
              isSidebarExpanded ? "px-3" : "justify-center",
            )}
          >
            {modeItems.map(({ value, label, icon: Icon }) => {
              const active = Number(value) === gameMode;
              return (
                <SidebarTooltip
                  key={value}
                  label={label}
                  disabled={isSidebarExpanded}
                >
                  <Link
                    href={`/${locale}/${value}`}
                    title={label}
                    aria-label={label}
                    onMouseEnter={() => setHoveredModeDesktop(value)}
                    onMouseLeave={() => setHoveredModeDesktop(null)}
                    className={cn(
                      "relative inline-flex h-10 items-center overflow-hidden rounded-lg border font-medium",
                      "transition-[width,padding,gap] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isSidebarExpanded
                        ? "w-full justify-start gap-2 px-3"
                        : "w-10 justify-center gap-0 px-0",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/65 bg-background text-foreground hover:border-primary/70 hover:bg-muted",
                    )}
                  >
                    <MotionHighlight
                      active={hoveredModeDesktop === value}
                      layoutId="sidebar-mode-highlight"
                      className="z-0 rounded-lg border border-primary/60 bg-primary/12 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
                    />
                    <Icon
                      className={cn(
                        "relative z-10 shrink-0",
                        isSidebarExpanded ? "size-4" : "size-5",
                      )}
                    />
                    <motion.span
                      className="relative z-10 inline-block overflow-hidden whitespace-nowrap"
                      initial={false}
                      animate={
                        isSidebarExpanded
                          ? { opacity: 1, x: 0, maxWidth: 120 }
                          : { opacity: 0, x: -6, maxWidth: 0 }
                      }
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {label}
                    </motion.span>
                  </Link>
                </SidebarTooltip>
              );
            })}
          </nav>

          <div
            className={cn(
              "mt-auto grid gap-2 pb-2",
              isSidebarExpanded ? "px-3" : "justify-center",
            )}
          >
            <ActionButtons
              expanded={isSidebarExpanded}
              layoutId="sidebar-action-hover-highlight"
            />
          </div>
        </div>
      </motion.aside>

      <Button
        type="button"
        onClick={isMenuOpen ? closeMenu : openMenu}
        variant="outline"
        size="icon"
        className={`${iconButtonClass} fixed left-3 top-3 z-50 lg:hidden`}
        aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
      >
        {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      <div className="lg:hidden">
        <Sheet
          open={isMenuOpen}
          onOpenChange={(open) => (open ? openMenu() : closeMenu())}
        >
          <SheetContent
            side="left"
            className="w-72 border-border/55 bg-background/98 p-4"
          >
            <SheetHeader className="mb-3">
              <SheetTitle className="title text-2xl tracking-[0.14em]">
                LETRIX
              </SheetTitle>
            </SheetHeader>

            <nav className="mb-4 grid gap-2">
              {modeItems.map(({ value, label, icon: Icon }) => {
                const active = Number(value) === gameMode;

                return (
                  <Link
                    key={value}
                    href={`/${locale}/${value}`}
                    onClick={closeMenu}
                    onMouseEnter={() => setHoveredModeMobile(value)}
                    onMouseLeave={() => setHoveredModeMobile(null)}
                    className={cn(
                      "relative flex items-center gap-2 overflow-hidden rounded-lg border px-3 py-2 font-semibold",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/65 bg-background text-foreground hover:border-primary/60 hover:bg-muted",
                    )}
                  >
                    <MotionHighlight
                      active={hoveredModeMobile === value}
                      layoutId="sidebar-mobile-mode-highlight"
                      className="z-0 rounded-lg border border-primary/60 bg-primary/12 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
                    />
                    <Icon className="relative z-10 size-5" />
                    <span className="relative z-10">{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="grid gap-2">
              <ActionButtons
                expanded
                closeAfterAction
                layoutId="sidebar-mobile-action-hover-highlight"
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
