import Link from "next/link";
import { FileDown } from "lucide-react";
import { getReconciliationRows, listCompetencias } from "@/lib/actions/reconciliation";
import { getChecklistState } from "@/lib/actions/checklist";
import { formatCurrency } from "@/lib/validation/currency";
import { ERROR_STATUSES, SITUACAO_CONFERENCIA_LABELS } from "@/lib/reconciliation/labels";
import { ChecklistForm } from "@/components/checklist/ChecklistForm";
import { CompetenciaSwitcher } from "@/components/checklist/CompetenciaSwitcher";

export const dynamic = "force-dynamic";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ companyId: string; competencia: string }>;
}) {
  const { companyId, competencia } = await params;

  const [rows, competencias, checklistItems] = await Promise.all([
    getReconciliationRows(companyId, competencia),
    listCompetencias(companyId),
    getChecklistState(companyId, competencia),
  ]);

  const concluidas = rows.filter((r) => r.situacaoVenda === "CONCLUIDO");
  const emitidas = rows.filter((r) => r.situacaoConferencia === "NF_EMITIDA");
  const ausentes = rows.filter((r) => r.situacaoConferencia === "NF_NAO_EMITIDA");
  const erros = rows.filter((r) => (ERROR_STATUSES as readonly string[]).includes(r.situacaoConferencia));

  const serviceCodesEmitidas = new Set(emitidas.flatMap((r) => r.matchedInvoices.map((i) => i.codigoServico)));

  const errorRows = erros.map((r) => ({
    saleId: r.saleId,
    codigoVenda: r.codigoVenda,
    comprador: r.comprador,
    situacao: SITUACAO_CONFERENCIA_LABELS[r.situacaoConferencia],
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white p-6 rounded-card border border-ink/8 shadow-card">
        <div>
          <h3 className="text-base font-bold text-ink">Checklist de Auditoria e Fechamento</h3>
          <p className="text-xs text-ink/50 mt-1">
            Confirme e valide todas as etapas da conferência antes do encerramento final.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CompetenciaSwitcher companyId={companyId} competencia={competencia} competencias={competencias} />
          <Link
            href={`/api/c/${companyId}/export/checklist-pdf?competencia=${competencia}`}
            className="px-4 py-2.5 bg-mint-600 hover:bg-mint-700 text-white rounded-pill text-xs font-bold shadow-card flex items-center gap-2 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" /> Baixar Relatório (PDF)
          </Link>
        </div>
      </div>

      <div className="bg-deep text-white p-6 rounded-card shadow-card space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <h4 className="font-bold text-sm text-mint-300">Resumo Executivo de Reconciliação</h4>
            <span className="text-[11px] text-sand/60">Competência: {competencia}</span>
          </div>
          <span className="text-xs bg-mint/20 text-mint-200 font-bold px-3 py-1 rounded-pill border border-mint/30">
            Plano A
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-white/5 p-3 rounded-input border border-white/10">
            <span className="text-[10px] text-sand/50 font-bold uppercase">Vendas Concluídas</span>
            <div className="text-lg font-black text-white mt-0.5">
              {formatCurrency(concluidas.reduce((a, r) => a + r.valorVenda, 0), "BRL")}
            </div>
          </div>
          <div className="bg-white/5 p-3 rounded-input border border-white/10">
            <span className="text-[10px] text-sand/50 font-bold uppercase">Notas Emitidas</span>
            <div className="text-lg font-black text-mint-300 mt-0.5">
              {formatCurrency(emitidas.reduce((a, r) => a + (r.valorNfFaturado ?? 0), 0), "BRL")}
            </div>
          </div>
          <div className="bg-white/5 p-3 rounded-input border border-white/10">
            <span className="text-[10px] text-sand/50 font-bold uppercase">NF Não Emitidas</span>
            <div className="text-lg font-black text-attention mt-0.5">
              {formatCurrency(ausentes.reduce((a, r) => a + r.valorNfCalculado, 0), "BRL")}
            </div>
          </div>
          <div className="bg-white/5 p-3 rounded-input border border-white/10">
            <span className="text-[10px] text-sand/50 font-bold uppercase">Erros Identificados</span>
            <div className="text-lg font-black text-danger mt-0.5">{erros.length}</div>
          </div>
        </div>
      </div>

      <ChecklistForm
        companyId={companyId}
        competencia={competencia}
        initialItems={checklistItems}
        errorRows={errorRows}
        multiServiceDetected={serviceCodesEmitidas.size > 1}
      />
    </div>
  );
}
