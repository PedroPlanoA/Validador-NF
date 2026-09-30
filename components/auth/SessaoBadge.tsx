"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/**
 * Quem está logado e como sair.
 *
 * Existe em toda tela de propósito: sem isso, a única forma de trocar de usuário
 * seria apagar cookie na mão — e num escritório em que se usa a máquina do
 * colega, isso acontece.
 */
export function SessaoBadge({ email, tom = "escuro" }: { email: string; tom?: "escuro" | "claro" }) {
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/sair", { method: "POST" });
    router.refresh();
    router.replace("/login");
  }

  const cor = tom === "escuro" ? "text-sand/70 hover:text-mint-300" : "text-ink/50 hover:text-deep";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-[11px] truncate ${tom === "escuro" ? "text-sand/55" : "text-ink/45"}`}>
        {email}
      </span>
      <button
        type="button"
        onClick={sair}
        title="Sair"
        aria-label="Sair"
        className={`shrink-0 transition-colors ${cor}`}
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
