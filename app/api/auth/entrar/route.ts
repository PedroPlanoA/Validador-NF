import { NextRequest, NextResponse } from "next/server";
import { ehAutorizado, normalizarEmail } from "@/lib/auth/autorizados";
import { conferirCodigo } from "@/lib/auth/codigos";
import { COOKIE_SESSAO, DURACAO_SESSAO_S, criarCookie } from "@/lib/auth/sessao";

export const runtime = "nodejs";

/** POST /api/auth/entrar — troca o código pela sessão. */
export async function POST(request: NextRequest) {
  let email = "";
  let codigo = "";
  try {
    const corpo = await request.json();
    email = normalizarEmail(String(corpo?.email ?? ""));
    codigo = String(corpo?.codigo ?? "");
  } catch {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  // Conferido de novo aqui: entre pedir o código e usá-lo, um master pode ter
  // removido a pessoa da lista. O código sozinho não basta para entrar.
  if (!(await ehAutorizado(email))) {
    return NextResponse.json(
      { erro: "Usuário não autorizado, contate o administrador." },
      { status: 403 },
    );
  }

  if (!(await conferirCodigo(email, codigo))) {
    return NextResponse.json({ erro: "Código inválido ou expirado." }, { status: 401 });
  }

  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE_SESSAO, await criarCookie(email), {
    httpOnly: true, // fora do alcance de qualquer script na página
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SESSAO_S,
  });
  return resposta;
}
