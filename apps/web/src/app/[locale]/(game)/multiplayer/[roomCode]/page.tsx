import { MultiplayerRoomPage } from "@/features/multiplayer/components/multiplayer-room-page";

type Props = {
  params: Promise<{
    locale: string;
    roomCode: string;
  }>;
};

export default async function MultiplayerRoomRoute({ params }: Props) {
  const { locale, roomCode } = await params;

  return <MultiplayerRoomPage locale={locale} roomCode={roomCode} />;
}
