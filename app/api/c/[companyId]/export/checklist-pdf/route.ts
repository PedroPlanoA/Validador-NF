import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { getReconciliationRows } from "@/lib/actions/reconciliation";
import { getChecklistState } from "@/lib/actions/checklist";
import { ERROR_STATUSES, SITUACAO_CONFERENCIA_LABELS } from "@/lib/reconciliation/labels";
import { ChecklistPdfDocument } from "@/lib/export/checklistPdf";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await context.params;
  const competencia = request.nextUrl.searchParams.get("competencia");
  if (!competencia) {
    return NextResponse.json({ error: "Parâmetro competencia é obrigatório" }, { status: 400 });
  }

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }

  const [rows, items] = await Promise.all([
    getReconciliationRows(companyId, competencia),
    getChecklistState(companyId, competencia),
  ]);

  const concluidas = rows.filter((r) => r.situacaoVenda === "CONCLUIDO");
  const emitidas = rows.filter((r) => r.situacaoConferencia === "NF_EMITIDA");
  const ausentes = rows.filter((r) => r.situacaoConferencia === "NF_NAO_EMITIDA");
  const erros = rows.filter((r) => (ERROR_STATUSES as readonly string[]).includes(r.situacaoConferencia));

  const buffer = await renderToBuffer(
    ChecklistPdfDocument({
      companyName: company.nome,
      competencia,
      vendasConcluidas: concluidas.reduce((a, r) => a + r.valorVenda, 0),
      notasEmitidas: emitidas.reduce((a, r) => a + (r.valorNfFaturado ?? 0), 0),
      nfNaoEmitidas: ausentes.reduce((a, r) => a + r.valorNfCalculado, 0),
      errosCount: erros.length,
      items,
      errorRows: erros.map((r) => ({
        saleId: r.saleId,
        codigoVenda: r.codigoVenda,
        comprador: r.comprador,
        situacao: SITUACAO_CONFERENCIA_LABELS[r.situacaoConferencia],
      })),
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Relatorio_Conferencia_${competencia}.pdf"`,
    },
  });
}
