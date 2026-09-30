import { NextRequest, NextResponse } from "next/server";
import { ehAutorizado, normalizarEmail } from "@/lib/auth/autorizados";
import { gerarCodigo, limparVencidos, PedidosDemais } from "@/lib/auth/codigos";
import { enviarCodigo } from "@/lib/auth/email";

export const runtime = "nodejs";

/**
 * POST /api/auth/codigo — pede o código de acesso.
 *
 * Quem não está na lista recebe a recusa **explícita** que o usuário pediu:
 * "usuário não autorizado, contate o administrador". Isso revela se um endereço
 * está liberado, o que num sistema público seria evitado — aqui é uma ferramenta
 * interna com lista fechada, e mandar a pessoa esperar um e-mail que nunca vai
 * chegar é pior do que dizer a verdade.
 */
export async function POST(request: NextRequest) {
  let email = "";
  try {
    const corpo = await request.json();
    email = normalizarEmail(String(corpo?.email ?? ""));
  } catch {
    return NextResponse.json({ erro: "Informe um e-mail." }, { status: 400 });
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ erro: "Informe um e-mail válido." }, { status: 400 });
  }

  if (!(await ehAutorizado(email))) {
    return NextResponse.json(
      { erro: "Usuário não autorizado, contate o administrador." },
      { status: 403 },
    );
  }

  try {
    const codigo = await gerarCodigo(email);
    await enviarCodigo(email, codigo);
    void limparVencidos();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PedidosDemais) {
      return NextResponse.json({ erro: e.message }, { status: 429 });
    }
    // O código já foi gravado, mas o e-mail não saiu. Dizer "enviado" deixaria a
    // pessoa esperando para sempre.
    console.error("[Auth] falha ao enviar código", e);
    return NextResponse.json(
      { erro: "Não consegui enviar o e-mail. Avise o administrador." },
      { status: 502 },
    );
  }
}
