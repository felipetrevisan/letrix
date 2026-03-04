import { NextResponse } from "next/server";
import {
  createMultiplayerRoom,
  getAuthorizedUserFromRequest,
} from "@/features/multiplayer/lib/server";
import { resolveLanguageFromLocale } from "@/lib/words";

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
      locale?: string;
      targetWins?: number;
    };

    const roomCode = await createMultiplayerRoom({
      user,
      language: resolveLanguageFromLocale(body.locale),
      targetWins: body.targetWins === 5 ? 5 : 3,
    });

    return NextResponse.json({ roomCode });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível criar a sala agora." },
      { status: 500 },
    );
  }
}
