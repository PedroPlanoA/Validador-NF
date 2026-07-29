import { NextRequest, NextResponse } from "next/server";
import { reanalyzeBatch } from "@/lib/imports/importService";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ companyId: string; batchId: string }> },
) {
  const { companyId, batchId } = await context.params;
  try {
    const batch = await reanalyzeBatch(companyId, batchId);
    return NextResponse.json({ batchId: batch.id, rowCount: batch.rowCount, competencias: batch.competencias });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao reanalisar lote" },
      { status: 400 },
    );
  }
}
