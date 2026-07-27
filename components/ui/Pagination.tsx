"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="p-4 border-t border-ink/8 flex items-center justify-between">
      <button
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        className="px-4 py-2 border border-ink/10 rounded-input text-xs font-semibold bg-white hover:bg-paper-alt/40 text-ink/70 disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-xs text-ink/50 font-medium">
        Página {page} de {Math.max(1, totalPages)}
      </span>
      <button
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
        className="px-4 py-2 border border-ink/10 rounded-input text-xs font-semibold bg-white hover:bg-paper-alt/40 text-ink/70 disabled:opacity-40"
      >
        Próximo
      </button>
    </div>
  );
}
