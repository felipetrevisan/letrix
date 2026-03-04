import { NextResponse } from "next/server";
import {
  getAuthorizedUserFromRequest,
  getMultiplayerRoomSnapshot,
} from "@/features/multiplayer/lib/server";

type Props = {
  params: Promise<{
    roomCode: string;
  }>;
};

export async function GET(request: Request, { params }: Props) {
  const { user, error } = await getAuthorizedUserFromRequest(request);

  if (error || !user) {
    return NextResponse.json(
      { error: "Faça login para jogar online." },
      { status: 401 },
    );
  }

  const { roomCode } = await params;
  const snapshot = await getMultiplayerRoomSnapshot(
    roomCode.trim().toUpperCase(),
    user.id,
  );

  if (!snapshot) {
    return NextResponse.json(
      { error: "Sala não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { snapshot },
    { headers: { "Cache-Control": "no-store" } },
  );
}
