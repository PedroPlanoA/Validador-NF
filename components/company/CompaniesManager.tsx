"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, Plus, Trash2, X, Check, SlidersHorizontal } from "lucide-react";
import { deleteCompanies } from "@/lib/actions/companies";
import { CreateCompanyForm } from "@/components/company/CreateCompanyForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface CompanyItem {
  id: string;
  codigo: string;
  nome: string;
  cnpj: string;
}

export function CompaniesManager({ companies }: { companies: CompanyItem[] }) {
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "delete">("view");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function cancelDeleteMode() {
    setMode("view");
    setSelected(new Set());
    setShowConfirm(false);
  }

  function confirmDelete() {
    startTransition(async () => {
      await deleteCompanies(Array.from(selected));
      cancelDeleteMode();
      router.refresh();
    });
  }

  const selectedCompanies = companies.filter((c) => selected.has(c.id));

  return (
    <>
      {companies.length === 0 ? (
        <p className="text-sm text-ink/50 italic">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {companies.map((company) => {
            const isSelected = selected.has(company.id);
            const cardBody = (
              <Card
                className={`p-5 relative transition-shadow ${
                  mode === "delete" ? "cursor-pointer" : "hover:shadow-card-hover"
                } ${isSelected ? "ring-2 ring-danger border-danger/30" : ""}`}
              >
                {mode === "delete" && (
                  <div
                    className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? "bg-danger border-danger" : "border-ink/20 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                )}
                <span className="text-[10px] text-ink/40 font-bold uppercase tracking-wider">
                  Código {company.codigo}
                </span>
                <h3 className="font-serif font-black text-lg text-ink mt-1 pr-6">{company.nome}</h3>
                <span className="text-xs text-ink/50 block mt-1">{company.cnpj}</span>
              </Card>
            );

            return mode === "delete" ? (
              <button key={company.id} type="button" onClick={() => toggleSelect(company.id)} className="text-left">
                {cardBody}
              </button>
            ) : (
              <Link key={company.id} href={`/c/${company.id}/dashboard`}>
                {cardBody}
              </Link>
            );
          })}
        </div>
      )}

      {mode === "delete" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-white border border-ink/10 shadow-card-hover rounded-pill px-5 py-3">
          <span className="text-xs font-semibold text-ink/60">
            {selected.size === 0 ? "Selecione empresas para excluir" : `${selected.size} selecionada(s)`}
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={selected.size === 0}
            className="text-xs font-bold text-danger bg-danger/10 px-4 py-2 rounded-pill disabled:opacity-40 disabled:cursor-not-allowed hover:bg-danger/20 transition-colors"
          >
            Excluir
          </button>
          <button onClick={cancelDeleteMode} className="text-ink/40 hover:text-ink p-1" title="Fechar seleção">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-40">
        {fabOpen && mode === "view" && (
          <div className="absolute bottom-16 right-0 bg-white border border-ink/10 shadow-card-hover rounded-card-sm py-2 w-60">
            <button
              onClick={() => {
                setShowAddModal(true);
                setFabOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper-alt/50 flex items-center gap-2.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-mint-600" /> Adicionar Empresa
            </button>
            <button
              onClick={() => {
                setMode("delete");
                setFabOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper-alt/50 flex items-center gap-2.5 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-danger" /> Excluir Empresa
            </button>
            <Link
              href="/config/platforms"
              className="w-full text-left px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper-alt/50 flex items-center gap-2.5 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-teal" /> Plataformas Mapeadas
            </Link>
          </div>
        )}
        <button
          onClick={() => setFabOpen((v) => !v)}
          className="w-14 h-14 rounded-full bg-deep text-white shadow-card-hover flex items-center justify-center hover:bg-deep-dark transition-colors"
          title="Ações"
        >
          <Settings className={`w-6 h-6 transition-transform duration-300 ${fabOpen ? "rotate-90" : ""}`} />
        </button>
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-card p-6 w-full max-w-lg shadow-card-hover"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-ink">Adicionar Empresa</h2>
              <button onClick={() => setShowAddModal(false)} className="text-ink/40 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <CreateCompanyForm onSuccess={() => setShowAddModal(false)} />
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card p-6 w-full max-w-md shadow-card-hover space-y-4">
            <h2 className="text-sm font-bold text-ink">Confirmar exclusão</h2>
            <p className="text-sm text-ink/70">
              Tem certeza que deseja excluir{" "}
              {selectedCompanies.length === 1
                ? `a empresa "${selectedCompanies[0].nome}"`
                : `as ${selectedCompanies.length} empresas selecionadas`}
              ? Todos os dados vinculados (vendas, notas, importações) serão apagados. Esta ação não pode ser
              desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={pending}>
                Não
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={pending}>
                {pending ? "Excluindo..." : "Sim"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
