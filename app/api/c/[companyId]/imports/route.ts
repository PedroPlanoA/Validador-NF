import { NextRequest, NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { importMetadataSchema } from "@/lib/validation/schemas";
import { runImport } from "@/lib/imports/importService";

export const runtime = "nodejs";

/** Importação de relatório grande é a operação mais demorada do sistema:
 *  padronizar centenas de milhares de linhas e inserir em lotes leva bem mais que
 *  o padrão de 60s da plataforma. O `TRANSACTION_OPTIONS` do importService fica
 *  abaixo deste teto de propósito. */
export const maxDuration = 300;

/**
 * O corpo é o **CSV das colunas já mapeadas**, comprimido com gzip pelo
 * navegador — não JSON. Duas razões:
 *
 *  - JSON repetiria o nome de cada campo em cada linha, e a string escapada
 *    ainda cresce com `\n` e `\"`;
 *  - o limite de tamanho de corpo de requisição da plataforma é o gargalo real
 *    da importação, então tudo o que reduz bytes aumenta direto o tamanho de
 *    arquivo que passa.
 *
 * Os metadados (fonte, config, nome do arquivo, competência de referência) vão
 * na query string, já que o corpo inteiro é o arquivo.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await context.params;
  const sp = request.nextUrl.searchParams;

  const parsed = importMetadataSchema.safeParse({
    sourceType: sp.get("sourceType"),
    configId: sp.get("configId"),
    filename: sp.get("filename"),
    referenceCompetencia: sp.get("referenceCompetencia"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  let mappedCsv: string;
  try {
    const raw = Buffer.from(await request.arrayBuffer());
    mappedCsv =
      request.headers.get("x-body-encoding") === "gzip"
        ? gunzipSync(raw).toString("utf8")
        : raw.toString("utf8");
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o conteúdo enviado" }, { status: 400 });
  }

  if (!mappedCsv.trim()) {
    return NextResponse.json({ error: "Arquivo não contém linhas de dados" }, { status: 400 });
  }

  try {
    const batch = await runImport(companyId, { ...parsed.data, mappedCsv });
    return NextResponse.json({ batchId: batch.id, rowCount: batch.rowCount, competencias: batch.competencias });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao importar arquivo" },
      { status: 400 },
    );
  }
}
