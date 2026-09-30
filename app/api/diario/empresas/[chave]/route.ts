import { NextRequest, NextResponse } from "next/server";
import { buscarEmpresa, mensagemDeErro } from "@/lib/diario/acessorias";
import { companyIdPorChave } from "@/lib/integracao/vinculoDiario";

export const runtime = "nodejs";

/** GET /api/diario/empresas/{cnpj} — dados frescos de uma empresa.
 *
 *  Vem junto o `companyId` do Validador quando o mesmo CNPJ existe lá, para a
 *  ficha oferecer o atalho sem uma segunda requisição. `null` quando não existe:
 *  aí nenhum botão aparece. */
export async function GET(_request: NextRequest, context: { params: Promise<{ chave: string }> }) {
  const { chave } = await context.params;
  try {
    const [r, companyId] = await Promise.all([buscarEmpresa(chave), companyIdPorChave(chave)]);
    if (!r) return NextResponse.json({ error: "Empresa não encontrada no Acessórias." }, { status: 404 });
    return NextResponse.json({ ...r, companyId });
  } catch (e) {
    return NextResponse.json({ error: mensagemDeErro(e) }, { status: 502 });
  }
}
