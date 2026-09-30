import { NextRequest, NextResponse } from "next/server";
import { listarEmpresas, mensagemDeErro } from "@/lib/diario/acessorias";

export const runtime = "nodejs";
/** A leitura completa do `ListAll` pode passar de alguns segundos em carteiras grandes. */
export const maxDuration = 120;

/** GET /api/diario/empresas[?atualizar=1] — lista de empresas do Acessórias (com cache). */
export async function GET(request: NextRequest) {
  const forcar = request.nextUrl.searchParams.get("atualizar") === "1";
  try {
    return NextResponse.json(await listarEmpresas(forcar));
  } catch (e) {
    return NextResponse.json({ error: mensagemDeErro(e) }, { status: 502 });
  }
}
