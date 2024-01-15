"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { useTranslations } from "next-intl";
import InfoIcon from "@mui/icons-material/QuestionMarkRounded";
import SettingsIcon from "@mui/icons-material/BrightnessLowRounded";
import MenuIcon from "@mui/icons-material/MenuRounded";
import BarIcon from "@mui/icons-material/BarChartRounded";
import LightModeIcon from "@mui/icons-material/LightModeRounded";
import DarkModeIcon from "@mui/icons-material/DarkModeRounded";
import ComputerIcon from "@mui/icons-material/ComputerRounded";

import { useGame } from "@/contexts/GameContext";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import "./styles.scss";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
} from "../ui/sheet";

export function Header() {
  const {
    setIsInfoModalOpen,
    setIsSettingsModalOpen,
    setIsStatsModalOpen,
    toggleMenu,
    isMenuOpen,
  } = useApp();
  const { getName, isTerm, isDuo, isTrio, isFour } = useGame();
  const { setTheme, theme } = useTheme();


  console.log(theme);

  const translate = useTranslations("global");

  return (
    <>
      <header>
        <div className="flex items-center justify-between toolbar">
          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => toggleMenu()}
              variant="ghost"
              color="secondary"
              size="icon"
            >
              <MenuIcon />
            </Button>
            <Button
              aria-label="how to play button"
              onClick={() => setIsInfoModalOpen(true)}
              variant="ghost"
              color="secondary"
              size="icon"
            >
              <InfoIcon />
            </Button>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              aria-label="theme button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              variant="ghost"
              color="secondary"
              size="icon"
            >
              {theme === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </Button>

            <Button
              aria-label="stats button"
              onClick={() => setIsStatsModalOpen(true)}
              variant="ghost"
              color="secondary"
              size="icon"
            >
              <BarIcon />
            </Button>

            <Button
              aria-label="settings button"
              onClick={() => setIsSettingsModalOpen(true)}
              variant="ghost"
              color="secondary"
              size="icon"
            >
              <SettingsIcon />
            </Button>
          </div>
        </div>
      </header>
      <Sheet open={isMenuOpen} modal={false} onOpenChange={toggleMenu}>
        <SheetContent side="left" className="w-[200px] sm:w-[240px]">
          <SheetHeader>
            <SheetDescription>
              <div className="py-10 overflow-y-auto">
                <ul className="space-y-2 font-medium">
                  <li>
                    <Link
                      data-disabled={isTerm()}
                      data-active={isTerm()}
                      href="/1"
                      className="flex items-center p-2 rounded-lg text-primary-foreground hover:bg-accent hover:text-accent-foreground group data-[active=true]:pointer-events-none data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                    >
                      <span className="ms-3">Termo</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      data-disabled={isDuo()}
                      data-active={isDuo()}
                      href="/2"
                      className="flex items-center p-2 rounded-lg text-primary-foreground hover:bg-accent hover:text-accent-foreground group data-[active=true]:pointer-events-none data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                    >
                      <span className="ms-3">Dueto</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      data-disabled={isTrio()}
                      data-active={isTrio()}
                      href="/3"
                      className="flex items-center p-2 rounded-lg text-primary-foreground hover:bg-accent hover:text-accent-foreground group data-[active=true]:pointer-events-none data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                    >
                      <span className="ms-3">Trieto</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      data-disabled={isFour()}
                      data-active={isFour()}
                      href="/4"
                      className="flex items-center p-2 rounded-lg text-primary-foreground hover:bg-accent hover:text-accent-foreground group data-[active=true]:pointer-events-none data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                    >
                      <span className="ms-3">Quarteto</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  );
}
