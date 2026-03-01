"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { gameSettings, initialConfig } from "@/config/game";
import { useLocalStorage } from "@/hooks/localStorage";
import { ContextProps, AppContextValue } from "@/interfaces/context";
import { Config, GameMode } from "@/interfaces/game";
import { LOADING_TIME_MS } from "@/config/settings";
import { getSupabaseBrowserClient } from "@/features/auth/lib/supabase-client";

export const AppContext = createContext<AppContextValue | null>({
  storage: initialConfig,
  isInfoModalOpen: false,
  isStatsModalOpen: false,
  isSettingsModalOpen: false,
  isMenuOpen: false,
  isSidebarExpanded: false,
  isLoading: false,
  user: null,
  isAuthReady: false,
  setIsInfoModalOpen: () => {},
  setIsStatsModalOpen: () => {},
  setIsSettingsModalOpen: () => {},
  saveConfig: () => {},
  signInWithMagicLink: async () => ({}),
  signInWithOAuth: async () => ({}),
  signOut: async () => {},
  toggleMenu: () => {},
  openMenu: () => {},
  closeMenu: () => {},
  toggleSidebar: () => {},
  loading: () => {},
  getConfig: (gameMode: GameMode) => gameSettings[gameMode],
});

AppContext.displayName = "AppContextValue";

export const useApp = () => useContext(AppContext) as AppContextValue;

export function AppProvider({ children }: ContextProps) {
  const [config, setConfig] = useLocalStorage<Config | null>(
    "config",
    initialConfig,
  );
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage<boolean>(
    "sidebar-expanded",
    false,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const loading = useCallback(() => {
    setTimeout(() => {
      setIsLoading(true);

      setTimeout(() => {
        setIsLoading(false);
      }, LOADING_TIME_MS);
    }, 0);
  }, [setIsLoading]);

  const saveConfig = useCallback(
    (data: Partial<Config>) => {
      const newConfig = { ...config, ...data };
      setConfig(newConfig);
    },
    [config, setConfig],
  );

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarExpanded((prev) => !prev);
  }, [setIsSidebarExpanded]);

  const getConfig = useCallback((gameMode: GameMode) => {
    return gameSettings[gameMode];
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return {
        error: "Não foi possível iniciar o login agora. Tente novamente.",
      };
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }, []);

  const signInWithOAuth = useCallback(
    async (provider: "google" | "discord") => {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        return {
          error: "Não foi possível iniciar o login agora. Tente novamente.",
        };
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    },
    [],
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setIsAuthReady(true);
      return;
    }

    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (isMounted) {
        setUser(data.user ?? null);
        setIsAuthReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        storage: config,
        isInfoModalOpen,
        isStatsModalOpen,
        isSettingsModalOpen,
        isMenuOpen,
        isSidebarExpanded,
        isLoading,
        user,
        isAuthReady,
        toggleMenu,
        openMenu,
        toggleSidebar,
        saveConfig,
        signInWithMagicLink,
        signInWithOAuth,
        signOut,
        setIsInfoModalOpen,
        setIsStatsModalOpen,
        setIsSettingsModalOpen,
        closeMenu,
        loading,
        getConfig,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
