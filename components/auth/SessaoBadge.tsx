"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/**
 * Sair.
 *
 * Existe em toda tela de propósito: sem isso, a única forma de trocar de usuário
 * seria apagar cookie na mão — e num escritório em que se usa a máquina do
 * colega, isso acontece.
 */
export function SessaoBadge({ tom = "escuro" }: { tom?: "escuro" | "claro" }) {
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/sair", { method: "POST" });
    router.refresh();
    router.replace("/login");
  }

  const cor = tom === "escuro" ? "text-sand/60 hover:text-mint-300" : "text-ink/45 hover:text-deep";

  // Só o ícone. O e-mail escrito ao lado poluía toda tela sem dizer nada que a
  // pessoa não soubesse — ela sabe quem é.
  return (
    <button
      type="button"
      onClick={sair}
      title="Sair"
      aria-label="Sair"
      className={`shrink-0 transition-colors ${cor}`}
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
