import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buscarEmpresas, ErroAcessorias } from "@/lib/ico/acessorias";
import { montarArquivoBase } from "@/lib/ico/montarArquivo";

/**
 * GET /api/ico-fiscal/arquivo?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
 *
 * Devolve o arquivo da base do ICO já com a carteira do Acessórias na aba
 * "Acessórias-Empresas" e o período gravado na "Base de Dados". As abas de
 * Domínio, Obrigações, Digisac e Contatos continuam para preencher à mão.
 *
 * Buscar a carteira inteira com os includes leva alguns segundos; o limite
 * de execução acompanha.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD.");

const parametros = z
  .object({ inicio: data, fim: data })
  .refine((p) => p.inicio <= p.fim, { message: "A data inicial não pode ser depois da final." });

export async function GET(request: NextRequest) {
  const p = parametros.safeParse({
    inicio: request.nextUrl.searchParams.get("inicio"),
    fim: request.nextUrl.searchParams.get("fim"),
  });
  if (!p.success) {
    return NextResponse.json({ erro: p.error.issues[0]?.message ?? "Período inválido." }, { status: 400 });
  }

  try {
    const empresas = await buscarEmpresas();
    if (empresas.length === 0) {
      return NextResponse.json(
        { erro: "O Acessórias não devolveu nenhuma empresa. Verifique o token e tente de novo." },
        { status: 502 },
      );
    }

    const { buffer, empresas: total, semClienteDesde } = await montarArquivoBase(empresas, p.data);
    const nome = `Dados ICO Fiscal ${p.data.inicio} a ${p.data.fim}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(nome)}"`,
        "Cache-Control": "no-store",
        // Lidos pela tela para mostrar o resumo do que veio.
        "X-Ico-Empresas": String(total),
        "X-Ico-Sem-Cliente-Desde": String(semClienteDesde),
      },
    });
  } catch (e) {
    const msg =
      e instanceof ErroAcessorias
        ? e.message
        : "Não foi possível montar o arquivo. Tente novamente em alguns instantes.";
    // O detalhe real fica no log do servidor; a tela recebe algo acionável.
    console.error("[ico-fiscal/arquivo]", e);
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
