import { NextResponse } from "next/server";
import {
  getAuthorizedUserFromRequest,
  submitMultiplayerGuess,
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
      guess?: string;
    };

    const roomCode = body.roomCode?.trim().toUpperCase();
    const guess = body.guess?.trim();

    if (!roomCode || !guess) {
      return NextResponse.json(
        { error: "Tentativa inválida." },
        { status: 400 },
      );
    }

    const submission = await submitMultiplayerGuess({ roomCode, user, guess });
    return NextResponse.json({ snapshot: null, submission });
  } catch (submitError) {
    const message =
      submitError instanceof Error ? submitError.message : "submit-failed";

    if (message === "word-not-found") {
      return NextResponse.json(
        { error: "Essa palavra não existe.", code: "word-not-found" },
        { status: 400 },
      );
    }

    if (message === "invalid-length") {
      return NextResponse.json(
        { error: "A tentativa precisa ter 5 letras." },
        { status: 400 },
      );
    }

    if (message === "round-countdown") {
      return NextResponse.json(
        { error: "A próxima palavra já está chegando." },
        { status: 409 },
      );
    }

    if (
      message === "room-not-found" ||
      message === "room-finished" ||
      message === "room-waiting" ||
      message === "round-locked" ||
      message === "room-forbidden"
    ) {
      return NextResponse.json(
        { error: "A rodada não está disponível para jogada agora." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível enviar a tentativa agora." },
      { status: 500 },
    );
  }
}
