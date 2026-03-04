import { NextResponse } from "next/server";
import {
  getAuthorizedUserFromRequest,
  getMultiplayerRoomSnapshot,
  requestMultiplayerRematch,
} from "@/features/multiplayer/lib/server";

export async function POST(request: Request) {
  const { user, error } = await getAuthorizedUserFromRequest(request);

  if (error || !user) {
    return NextResponse.json(
      { error: "Faça login para jogar online." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      roomCode?: string;
    };

    const roomCode = body.roomCode?.trim().toUpperCase();

    if (!roomCode) {
      return NextResponse.json({ error: "Sala inválida." }, { status: 400 });
    }

    await requestMultiplayerRematch({ roomCode, user });
    const snapshot = await getMultiplayerRoomSnapshot(roomCode, user.id);

    return NextResponse.json({ snapshot });
  } catch (rematchError) {
    const message =
      rematchError instanceof Error ? rematchError.message : "rematch-failed";

    if (message === "room-not-found") {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 },
      );
    }

    if (
      message === "room-not-finished" ||
      message === "room-incomplete" ||
      message === "room-forbidden"
    ) {
      return NextResponse.json(
        { error: "Não foi possível pedir revanche agora." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível pedir revanche agora." },
      { status: 500 },
    );
  }
}
