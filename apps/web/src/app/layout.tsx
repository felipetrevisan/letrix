import { type CSSProperties, type ReactNode } from "react";
import "./styles.css";

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
        {children}
      </body>
    </html>
  );
}
