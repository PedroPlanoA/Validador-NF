import * as XLSX from "xlsx";
import type { ReconciliationRow } from "@/lib/reconciliation/types";
import { SITUACAO_CONFERENCIA_LABELS } from "@/lib/reconciliation/labels";
import type { Sale, Invoice } from "@/lib/generated/prisma/client";

function workbookBuffer(sheetName: string, rows: Record<string, unknown>[]): Buffer {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function buildReconciliationWorkbook(rows: ReconciliationRow[]): Buffer {
  return workbookBuffer(
    "Análise de Conferência",
    rows.map((r) => ({
      "Código Venda": r.codigoVenda,
      Comprador: r.comprador,
      Plataforma: r.plataforma,
      Moeda: r.moeda,
      "Valor Venda Bruto": r.valorVenda,
      "Valor Calc. NF": r.valorNfCalculado,
      "Situação Venda": r.situacaoVenda,
      "Situação Conferência": SITUACAO_CONFERENCIA_LABELS[r.situacaoConferencia],
      "Notas Vinculadas": r.matchedInvoices.map((i) => `${i.tipo} #${i.numero}`).join(", ") || "—",
      "Valor Faturado NF": r.valorNfFaturado ?? 0,
      Competência: r.competencia,
    })),
  );
}

export function buildSalesWorkbook(sales: Sale[]): Buffer {
  return workbookBuffer(
    "Vendas",
    sales.map((s) => ({
      "Código Venda": s.codigoVenda,
      Comprador: s.comprador,
      Plataforma: s.plataforma,
      Moeda: s.moeda,
      "Valor Venda": s.valorVenda,
      Comissão: s.comissao,
      "Valor Calc. NF": s.valorNf,
      "Situação Venda": s.situacaoVenda,
      Competência: s.competencia,
    })),
  );
}

export function buildInvoicesWorkbook(invoices: Invoice[]): Buffer {
  return workbookBuffer(
    "Notas",
    invoices.map((i) => ({
      "Código Venda": i.codigoVenda,
      Comprador: i.comprador,
      "Situação NF": i.situacaoNf,
      "Valor NF": i.valorNf,
      "Número NF": i.numero,
      Tipo: i.tipo,
      "Código Serviço": i.codigoServico,
      Competência: i.competencia,
    })),
  );
}
