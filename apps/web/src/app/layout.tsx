import type { Metadata } from "next";
import { type CSSProperties, type ReactNode } from "react";
import { PwaRegistration } from "@/features/shared/components/pwa-registration";
import "./styles.css";

export const metadata: Metadata = {
  applicationName: "Letrix",
  title: "Letrix",
  description: "Jogo de palavras, desafios e puzzle diário em português.",
  manifest: "/manifest.webmanifest",
  themeColor: "#2563eb",
  icons: {
    icon: [{ url: "/brand/letrix-logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/letrix-logo.png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Letrix",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        style={
          {
            "--font-montserrat":
              '"Montserrat", "Avenir Next", "Segoe UI", sans-serif',
            "--font-bebas": '"Bebas Neue", "Oswald", "Impact", sans-serif',
          } as CSSProperties
        }
      >
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
