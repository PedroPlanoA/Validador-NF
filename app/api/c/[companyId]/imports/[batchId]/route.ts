import { NextRequest, NextResponse } from "next/server";
import { deleteBatch } from "@/lib/imports/importService";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ companyId: string; batchId: string }> },
) {
  const { companyId, batchId } = await context.params;
  try {
    await deleteBatch(companyId, batchId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao excluir arquivo importado" },
      { status: 400 },
    );
  }
}
