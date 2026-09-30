import { NextResponse } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth/sessao";

export const runtime = "nodejs";

/** POST /api/auth/sair — encerra a sessão neste navegador. */
export async function POST() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE_SESSAO, "", { path: "/", maxAge: 0 });
  return resposta;
}
