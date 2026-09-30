import { NextRequest, NextResponse } from "next/server";
import { buscarEmpresa, mensagemDeErro } from "@/lib/diario/acessorias";

export const runtime = "nodejs";

/** GET /api/diario/empresas/{cnpj} — dados frescos de uma empresa. */
export async function GET(_request: NextRequest, context: { params: Promise<{ chave: string }> }) {
  const { chave } = await context.params;
  try {
    const r = await buscarEmpresa(chave);
    if (!r) return NextResponse.json({ error: "Empresa não encontrada no Acessórias." }, { status: 404 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: mensagemDeErro(e) }, { status: 502 });
  }
}
