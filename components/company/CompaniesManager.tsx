"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, Plus, Trash2, X, Check, SlidersHorizontal, Search, Building2 } from "lucide-react";
import { deleteCompanies } from "@/lib/actions/companies";
import { CreateCompanyForm } from "@/components/company/CreateCompanyForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FAB_BUTTON_CLASS, FAB_ICON_CLASS, FAB_ITEM_CLASS, FAB_MENU_CLASS } from "@/components/ui/Fab";

interface CompanyItem {
  id: string;
  codigo: string;
  nome: string;
  cnpj: string;
}

const OPEN_ANIMATION_MS = 200;

export function CompaniesManager({ companies }: { companies: CompanyItem[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "delete">("view");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const visibleCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    const qDigits = q.replace(/\D/g, "");
    return companies.filter((c) => {
      const cnpjDigits = c.cnpj.replace(/\D/g, "");
      return (
        c.codigo.toLowerCase().includes(q) ||
        c.nome.toLowerCase().includes(q) ||
        (qDigits && cnpjDigits.includes(qDigits))
      );
    });
  }, [companies, search]);

  function openCompany(e: React.MouseEvent, href: string, id: string) {
    e.preventDefault();
    setOpeningId(id);
    setTimeout(() => router.push(href), OPEN_ANIMATION_MS);
  }

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
        <>
          {mode === "view" && (
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por código, nome ou CNPJ..."
                className="w-full pl-11 pr-4 py-3 text-sm text-ink placeholder:text-ink/40 border border-ink/10 rounded-input outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint bg-white"
              />
            </div>
          )}

          {visibleCompanies.length === 0 ? (
            <p className="text-sm text-ink/50 italic">Nenhuma empresa corresponde à pesquisa.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {visibleCompanies.map((company) => {
                const isSelected = selected.has(company.id);
                const isOpening = openingId === company.id;
                const isDimmed = openingId !== null && !isOpening;
                const href = `/c/${company.id}/dashboard`;
                const cardBody = (
                  <Card
                    className={`p-5 relative transition-all duration-200 ${
                      mode === "delete" ? "cursor-pointer" : "hover:shadow-card-hover"
                    } ${isSelected ? "ring-2 ring-danger border-danger/30" : ""} ${
                      isOpening ? "scale-105 shadow-card-hover" : ""
                    } ${isDimmed ? "opacity-40" : ""}`}
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
                    <span className="inline-flex items-center bg-deep/8 text-deep text-[10px] font-bold uppercase tracking-[.14em] px-2.5 py-1 rounded-pill">
                      Código {company.codigo}
                    </span>
                    <h3 className="font-sans font-semibold text-xl text-mint-600 mt-2.5 pr-6 leading-snug">
                      {company.nome}
                    </h3>
                    <span className="text-xs text-ink/50 block mt-1.5 tabular-nums">{company.cnpj}</span>
                  </Card>
                );

                return mode === "delete" ? (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => toggleSelect(company.id)}
                    className="text-left"
                  >
                    {cardBody}
                  </button>
                ) : (
                  <Link key={company.id} href={href} onClick={(e) => openCompany(e, href, company.id)}>
                    {cardBody}
                  </Link>
                );
              })}
            </div>
          )}
        </>
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

      {mode === "view" && (
        <div className="fixed bottom-6 left-6 z-30 hidden sm:flex items-center gap-2 bg-white border border-ink/10 shadow-card rounded-pill px-4 py-2.5 text-xs font-semibold text-ink/60">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          {companies.length} {companies.length === 1 ? "empresa cadastrada" : "empresas cadastradas"}
        </div>
      )}

      <div className="group fixed bottom-6 right-6 z-40">
        {mode === "view" && (
          <div className={FAB_MENU_CLASS}>
            <div className="bg-white border border-ink/10 shadow-card-hover rounded-card-sm py-2 w-60">
              <button onClick={() => setShowAddModal(true)} className={FAB_ITEM_CLASS}>
                <Plus className="w-4 h-4 text-mint-600" /> Adicionar Empresa
              </button>
              <button onClick={() => setMode("delete")} className={FAB_ITEM_CLASS}>
                <Trash2 className="w-4 h-4 text-danger" /> Excluir Empresa
              </button>
              <Link href="/config/platforms" className={FAB_ITEM_CLASS}>
                <SlidersHorizontal className="w-4 h-4 text-teal" /> Plataformas Mapeadas
              </Link>
            </div>
          </div>
        )}
        <button className={FAB_BUTTON_CLASS} aria-label="Ações" title="Ações">
          <Settings className={FAB_ICON_CLASS} />
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
