import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLockup } from "@/components/layout/BrandLockup";

/**
 * Faixa de marca do Hub. A mesma em todas as telas de fora do contexto de
 * empresa (hub, empresas, ferramentas), para a navegação não trocar de cara a
 * cada passo. `voltar` liga o caminho de volta ao hub.
 */
export function HubHeader({ titulo, voltar }: { titulo: string; voltar?: { href: string; label: string } }) {
  return (
    <div className="bg-deep px-8 py-7">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <BrandLockup size="lg" />
        </Link>
        <h1 className="font-sans font-light text-2xl text-white/95 whitespace-nowrap tracking-[0.01em]">
          {titulo}
        </h1>
      </div>
      {voltar && (
        <Link
          href={voltar.href}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint-300 hover:text-white transition-colors mt-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {voltar.label}
        </Link>
      )}
    </div>
  );
}
