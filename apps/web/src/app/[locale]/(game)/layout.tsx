"use client";

import { ReactNode } from "react";
import { Header } from "@/features/navigation/components/header";
import { Modals } from "@/features/shared/components/modals-root";
import { GameProvider } from "@/contexts/GameContext";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
};

export default function GameLayout({ children }: Props) {
  const { isSidebarExpanded } = useApp();

  return (
    <GameProvider>
      <Header />
      <main
        className={cn(
          "relative flex min-h-0 w-full flex-1 items-stretch justify-center px-2 pb-4 pt-16 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-4 md:pb-6 lg:pr-4 lg:pt-4",
          isSidebarExpanded ? "lg:pl-[17rem]" : "lg:pl-24",
        )}
      >
        {children}
        <Modals />
      </main>
    </GameProvider>
  );
}
