import { NextRequest, NextResponse } from "next/server";
import { getReconciliationRows } from "@/lib/actions/reconciliation";
import { buildReconciliationWorkbook } from "@/lib/export/excelExport";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await context.params;
  const competencia = request.nextUrl.searchParams.get("competencia") ?? undefined;

  const rows = await getReconciliationRows(companyId, competencia);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Nenhum dado para exportar" }, { status: 400 });
  }

  const buffer = buildReconciliationWorkbook(rows);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="PlanoA_Analise_Consolidada.xlsx"`,
    },
  });
}
