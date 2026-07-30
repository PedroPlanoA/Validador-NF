"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, SlidersHorizontal, ArrowLeftRight } from "lucide-react";

/** Ações que não pertencem ao fluxo de conferência (mapear colunas, trocar de
 *  empresa) saíram do menu lateral para este botão flutuante — mesmo padrão da
 *  tela de empresas, para o menu lateral conter só as abas de trabalho. */
export function CompanyFab({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClasses =
    "w-full text-left px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper-alt/60 flex items-center gap-2.5 transition-colors";

  return (
    <div className="fixed bottom-6 right-6 z-40" ref={ref}>
      {open && (
        <div className="absolute bottom-16 right-0 bg-white border border-ink/10 shadow-card-hover rounded-card-sm py-2 w-56">
          <Link
            href={`/c/${companyId}/config/platforms`}
            className={itemClasses}
            onClick={() => setOpen(false)}
          >
            <SlidersHorizontal className="w-4 h-4 text-teal" /> Mapear
          </Link>
          <Link href="/companies" className={itemClasses} onClick={() => setOpen(false)}>
            <ArrowLeftRight className="w-4 h-4 text-mint-600" /> Trocar Empresa
          </Link>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-deep text-white shadow-card-hover flex items-center justify-center hover:bg-deep-dark transition-colors outline-none focus-visible:ring-4 focus-visible:ring-mint/40"
        aria-expanded={open}
        aria-label="Ações"
        title="Ações"
      >
        <Settings className={`w-6 h-6 transition-transform duration-300 ${open ? "rotate-90" : ""}`} />
      </button>
    </div>
  );
}
