import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLockup } from "@/components/layout/BrandLockup";

/**
 * Faixa de marca do Hub — a mesma em todas as telas fora do contexto de empresa.
 *
 * A faixa tem **altura fixa**: o botão de voltar não mora aqui. Quando morava, a
 * faixa engrossava só nas telas que tinham para onde voltar, e a barra "pulava"
 * de tamanho ao navegar entre o hub e uma ferramenta.
 */
export function HubHeader({ titulo }: { titulo: string }) {
  return (
    <div className="bg-deep px-8 py-7 flex items-center justify-between gap-4">
      <Link href="/" className="shrink-0">
        <BrandLockup size="lg" />
      </Link>
      <h1 className="font-sans font-light text-2xl text-white/95 whitespace-nowrap tracking-[0.01em]">
        {titulo}
      </h1>
    </div>
  );
}

/**
 * Voltar para o hub, fora da faixa.
 *
 * Em repouso é um **relevo negativo** — sombra interna, como um botão afundado
 * no fundo da página. No hover ele sobe: fundo branco e sombra externa. O
 * movimento é só de sombra e cor, sem mudar tamanho, para nada ao redor deslocar.
 */
export function VoltarParaFerramentas({ label = "Ferramentas" }: { label?: string }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/55 bg-paper-alt/80 rounded-pill px-3.5 py-2
                 shadow-[inset_0_2px_5px_rgba(0,50,60,0.15)]
                 hover:text-deep hover:bg-white hover:shadow-card
                 transition-all duration-200
                 outline-none focus-visible:ring-4 focus-visible:ring-mint/30"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> {label}
    </Link>
  );
}
