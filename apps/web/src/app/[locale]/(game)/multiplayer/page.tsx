import { MultiplayerLobbyPage } from "@/features/multiplayer/components/multiplayer-lobby-page";

type Props = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function MultiplayerLobbyRoute({ params }: Props) {
  const { locale } = await params;

  return <MultiplayerLobbyPage locale={locale} />;
}
