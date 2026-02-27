import { type ReactNode } from "react";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/theme-provider";

type Props = {
  children: ReactNode;
};

export default function LocaleLayout({ children }: Props) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="theme"
    >
      <AppProvider>{children}</AppProvider>
    </ThemeProvider>
  );
}
