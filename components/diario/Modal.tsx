"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** Modal no mesmo molde dos modais da lista de empresas do Validador. */
export function Modal({
  titulo,
  sub,
  onFechar,
  largura = "max-w-lg",
  children,
}: {
  titulo: string;
  sub?: string;
  onFechar: () => void;
  largura?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-card p-6 w-full ${largura} shadow-card-hover max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between mb-1 shrink-0">
          <h2 className="text-sm font-bold text-ink font-sans tracking-normal">{titulo}</h2>
          <button onClick={onFechar} className="text-ink/40 hover:text-ink" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        {sub && <p className="text-xs text-ink/50 mb-4 shrink-0">{sub}</p>}
        <div className="min-h-0 flex-1 flex flex-col">{children}</div>
      </div>
    </div>
  );
}
