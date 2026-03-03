import { NextResponse } from "next/server";
import { getAdminDashboardData } from "@/features/admin/lib/admin-analytics";
import { isServerAdminEmail } from "@/features/admin/lib/admin-access";
import {
  getSupabaseServerClient,
  getSupabaseServerConfigStatus,
} from "@/features/auth/lib/supabase-server";

const getAccessTokenFromRequest = (request: Request) => {
  const authorization = request.headers.get("authorization")?.trim();

  if (!authorization?.toLocaleLowerCase("en-US").startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
};

export async function GET(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    console.error("[admin/overview] missing server config", {
      ...getSupabaseServerConfigStatus(),
    });

    return NextResponse.json(
      { error: "Painel administrativo indisponível no momento." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user?.email || !isServerAdminEmail(user.email)) {
    console.error("[admin/overview] access denied", {
      hasUser: Boolean(user),
      email: user?.email ?? null,
      authError: userError?.message ?? null,
    });

    return NextResponse.json(
      { error: "Acesso negado." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const data = await getAdminDashboardData();

    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[admin/overview] dashboard aggregation failed", error);

    return NextResponse.json(
      { error: "Não foi possível carregar o painel agora." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
