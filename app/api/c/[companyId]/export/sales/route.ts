import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildSalesWorkbook } from "@/lib/export/excelExport";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await context.params;
  const competencia = request.nextUrl.searchParams.get("competencia");

  const sales = await db.sale.findMany({
    where: { companyId, ...(competencia ? { competencia } : {}) },
  });
  if (sales.length === 0) {
    return NextResponse.json({ error: "Nenhum dado para exportar" }, { status: 400 });
  }

  const buffer = buildSalesWorkbook(sales);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="PlanoA_Vendas.xlsx"`,
    },
  });
}
