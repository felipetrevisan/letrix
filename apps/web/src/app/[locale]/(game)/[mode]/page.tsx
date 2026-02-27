import { notFound } from "next/navigation";
import { parseCoreGameMode } from "@letrix/game-core";
import { GameModePage } from "@/features/game/components/game-mode-page";
import { GameMode } from "@/interfaces/game";

type Props = {
  params: Promise<{
    mode: string;
  }>;
};

export default async function ModePage({ params }: Props) {
  const { mode } = await params;
  const parsedMode = parseCoreGameMode(mode);

  if (!parsedMode) {
    notFound();
  }

  return <GameModePage mode={parsedMode} />;
}
