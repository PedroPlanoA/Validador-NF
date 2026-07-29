"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown } from "lucide-react";

export interface ExportOption {
  label: string;
  href: string;
}

/** Icon+text "Exportar Dados Brutos" button. A single option renders as a
 *  direct download link; multiple options reveal a small dropdown. */
export function ExportRawDataButton({ options }: { options: ExportOption[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const buttonClasses =
    "flex items-center gap-2 text-sm font-bold text-positive border border-positive/25 hover:bg-positive/10 rounded-input px-4 py-2.5 transition-colors";

  if (options.length === 1) {
    return (
      <a href={options[0].href} className={buttonClasses}>
        <Download className="w-4 h-4" /> Exportar Dados Brutos
      </a>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className={buttonClasses}>
        <Download className="w-4 h-4" /> Exportar Dados Brutos <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute z-30 top-full right-0 mt-2 bg-white border border-ink/10 rounded-card-sm shadow-card-hover py-1.5 min-w-[200px]">
          {options.map((o) => (
            <a
              key={o.href}
              href={o.href}
              className="block px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper-alt/60 transition-colors"
              onClick={() => setOpen(false)}
            >
              {o.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
