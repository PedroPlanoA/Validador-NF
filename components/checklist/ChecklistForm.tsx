"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { saveChecklistState, type ChecklistItems } from "@/lib/actions/checklist";

interface ErrorRowSummary {
  saleId: string;
  codigoVenda: string;
  comprador: string;
  situacao: string;
}

export function ChecklistForm({
  companyId,
  competencia,
  initialItems,
  errorRows,
  multiServiceDetected,
}: {
  companyId: string;
  competencia: string;
  initialItems: ChecklistItems;
  errorRows: ErrorRowSummary[];
  multiServiceDetected: boolean;
}) {
  const [items, setItems] = useState<ChecklistItems>(initialItems);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [, startTransition] = useTransition();

  function persist(next: ChecklistItems) {
    setItems(next);
    startTransition(() => {
      saveChecklistState(companyId, competencia, next);
    });
  }

  function toggle(key: string) {
    persist({ ...items, [key]: !items[key] });
  }

  const errorChecks = errorRows.map((r) => items[`error:${r.saleId}`] ?? false);
  const allErrorsChecked = errorRows.length === 0 || errorChecks.every(Boolean);

  function toggleAllErrors(checked: boolean) {
    const next = { ...items };
    for (const r of errorRows) next[`error:${r.saleId}`] = checked;
    persist(next);
  }

  function toggleOneError(saleId: string, checked: boolean) {
    persist({ ...items, [`error:${saleId}`]: checked });
  }

  return (
    <div className="bg-white p-6 rounded-card border border-ink/8 shadow-card space-y-4">
      <h4 className="text-xs font-extrabold text-ink/70 uppercase tracking-wider mb-2">
        Itens Obrigatórios de Verificação
      </h4>

      <div className="space-y-3">
        <label className="flex items-center gap-3 p-3.5 bg-paper-alt/30 border border-ink/8 rounded-input cursor-pointer hover:bg-paper-alt/60 transition-colors">
          <input
            type="checkbox"
            checked={!!items.item1}
            onChange={() => toggle("item1")}
            className="w-4 h-4 rounded accent-mint-600 cursor-pointer"
          />
          <span className="text-xs font-semibold text-ink">Alterado acumulador para exportação</span>
        </label>

        <div className="bg-paper-alt/30 border border-ink/8 rounded-input overflow-hidden">
          <div className="flex items-center justify-between p-3.5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allErrorsChecked}
                onChange={(e) => toggleAllErrors(e.target.checked)}
                className="w-4 h-4 rounded accent-mint-600 cursor-pointer"
              />
              <span className="text-xs font-semibold text-ink">Corrigido erros</span>
            </label>
            <button
              onClick={() => setErrorsOpen((v) => !v)}
              className="text-ink/40 hover:text-ink/60 p-1 flex items-center gap-1 text-xs font-bold"
            >
              <span className="bg-status-error/12 text-status-error px-2 py-0.5 rounded-pill text-[10px]">
                {errorRows.length} erro(s)
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${errorsOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          {errorsOpen && (
            <div className="border-t border-ink/8 bg-white p-4 space-y-2 max-h-72 overflow-y-auto">
              {errorRows.length === 0 ? (
                <p className="text-xs text-ink/40 italic">Nenhum erro de reconciliação no período.</p>
              ) : (
                errorRows.map((r) => (
                  <label key={r.saleId} className="flex items-center gap-3 text-xs">
                    <input
                      type="checkbox"
                      checked={items[`error:${r.saleId}`] ?? false}
                      onChange={(e) => toggleOneError(r.saleId, e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-mint-600 cursor-pointer"
                    />
                    <span className="font-semibold text-ink">{r.codigoVenda}</span>
                    <span className="text-ink/50">{r.comprador}</span>
                    <span className="text-ink/40">— {r.situacao}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 p-3.5 bg-paper-alt/30 border border-ink/8 rounded-input cursor-pointer hover:bg-paper-alt/60 transition-colors">
          <input
            type="checkbox"
            checked={!!items.item3}
            onChange={() => toggle("item3")}
            className="w-4 h-4 rounded accent-mint-600 cursor-pointer"
          />
          <span className="text-xs font-semibold text-ink">Valor total de notas emitidas igual ao emissor</span>
        </label>

        <label className="flex items-center gap-3 p-3.5 bg-paper-alt/30 border border-ink/8 rounded-input cursor-pointer hover:bg-paper-alt/60 transition-colors">
          <input
            type="checkbox"
            checked={!!items.item4}
            onChange={() => toggle("item4")}
            className="w-4 h-4 rounded accent-mint-600 cursor-pointer"
          />
          <span className="text-xs font-semibold text-ink">Valor total de notas emitidas conferido com Domínio</span>
        </label>

        <label className="flex items-center gap-3 p-3.5 bg-paper-alt/30 border border-ink/8 rounded-input cursor-pointer hover:bg-paper-alt/60 transition-colors">
          <input
            type="checkbox"
            checked={!!items.item5}
            onChange={() => toggle("item5")}
            className="w-4 h-4 rounded accent-mint-600 cursor-pointer"
          />
          <div className="flex-1 flex justify-between items-center">
            <span className="text-xs font-semibold text-ink">Ajustado acumulador para serviços diferentes</span>
            {multiServiceDetected && (
              <span className="text-[9px] bg-status-warning-warm/15 text-status-warning-warm font-bold px-2 py-0.5 rounded-pill">
                Múltiplos Serviços Detectados
              </span>
            )}
          </div>
        </label>

        <label className="flex items-center gap-3 p-3.5 bg-paper-alt/30 border border-ink/8 rounded-input cursor-pointer hover:bg-paper-alt/60 transition-colors">
          <input
            type="checkbox"
            checked={!!items.item6}
            onChange={() => toggle("item6")}
            className="w-4 h-4 rounded accent-mint-600 cursor-pointer"
          />
          <span className="text-xs font-semibold text-ink">Ajustado acumulador para vendas fora de plataforma</span>
        </label>
      </div>
    </div>
  );
}
