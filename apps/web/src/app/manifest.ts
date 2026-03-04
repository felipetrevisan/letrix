import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Letrix",
    short_name: "Letrix",
    description:
      "Jogo de palavras diário em português com modos solo e multiplayer local por tabuleiros.",
    lang: "pt-BR",
    start_url: "/pt/1",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#02081f",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/brand/letrix-logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/letrix-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/letrix-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
