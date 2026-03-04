import { NextResponse } from "next/server";
import {
  getAuthorizedUserFromRequest,
  joinMultiplayerRoom,
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
      return NextResponse.json(
        { error: "Informe o código da sala." },
        { status: 400 },
      );
    }

    const joinedRoomCode = await joinMultiplayerRoom({ roomCode, user });

    return NextResponse.json({ roomCode: joinedRoomCode });
  } catch (joinError) {
    const message =
      joinError instanceof Error ? joinError.message : "join-failed";

    if (message === "room-not-found") {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 },
      );
    }

    if (message === "room-full") {
      return NextResponse.json(
        { error: "Essa sala já está cheia." },
        { status: 409 },
      );
    }

    if (message === "room-finished") {
      return NextResponse.json(
        { error: "Essa sala já terminou." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível entrar na sala agora." },
      { status: 500 },
    );
  }
}
