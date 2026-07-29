import { NextRequest, NextResponse } from "next/server";
import { importRequestSchema } from "@/lib/validation/schemas";
import { runImport } from "@/lib/imports/importService";
import { csvToRows } from "@/lib/parsing/csvRows";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest, context: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await context.params;
  const body = await request.json();
  const parsed = importRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const { rawCsv, ...rest } = parsed.data;
  const rawRows = csvToRows(rawCsv);
  if (rawRows.length === 0) {
    return NextResponse.json({ error: "Arquivo não contém linhas de dados" }, { status: 400 });
  }

  try {
    const batch = await runImport(companyId, { ...rest, rawRows });
    return NextResponse.json({ batchId: batch.id, rowCount: batch.rowCount, competencias: batch.competencias });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao importar arquivo" },
      { status: 400 },
    );
  }
}
