import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLockup } from "@/components/layout/BrandLockup";

/**
 * Faixa de marca do Hub — a mesma em todas as telas fora do contexto de empresa.
 *
 * A faixa tem **altura fixa**: o botão de voltar não mora aqui. Quando morava, a
 * faixa engrossava só nas telas que tinham para onde voltar, e a barra "pulava"
 * de tamanho ao navegar entre o hub e uma ferramenta.
 *
 * O degradê escurece de leve para a direita, dentro do mesmo verde-petróleo — dá
 * profundidade à faixa sem introduzir cor nova, o que quebraria a paleta.
 */
export function HubHeader({ titulo }: { titulo: string }) {
  return (
    <div className="bg-[linear-gradient(to_right,var(--color-deep),var(--color-deep-dark))] px-8 py-7 flex items-center justify-between gap-6">
      {/* A marca lidera (30px/900) e o nome da tela apoia (22px/700). O problema
          original era os dois terem o mesmo tamanho ótico e empatarem; resolvido
          pela diferença de tamanho, com a marca no topo da hierarquia.

          Peso normal: ao lado do 900 da marca, qualquer bold no título voltava a
          disputar atenção. A hierarquia fica inteira no tamanho e no peso da
          marca. */}
      <Link href="/" className="shrink-0">
        <BrandLockup size="lg" />
      </Link>
      <div className="flex items-center gap-4 min-w-0">
        <span className="h-px w-10 bg-mint-300 shrink-0" />
        <h1 className="font-serif font-normal text-[16px] text-mint-300 whitespace-nowrap">
          {titulo}
        </h1>
      </div>
    </div>
  );
}

/**
 * Voltar para o hub, fora da faixa e alinhado à margem da tela (o mesmo `px-8`
 * do cabeçalho), não à coluna central de conteúdo.
 *
 * Estilo **debossed**: em repouso parece carimbado no fundo — sombra interna
 * escura em cima, fio de luz interno embaixo. No hover ele emerge: fundo branco e
 * sombra externa. Só sombra e cor mudam, sem alterar tamanho, para nada ao redor
 * deslocar.
 */
export function VoltarParaFerramentas({ label = "Ferramentas" }: { label?: string }) {
  return (
    <div className="px-8 pt-7">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[13px] font-bold text-ink/40 bg-paper-alt/70 rounded-pill px-5 py-2.5
                   shadow-[inset_0_1px_3px_rgba(0,50,60,0.10),inset_0_-1px_0_rgba(255,255,255,0.70)]
                   hover:text-deep hover:bg-white hover:shadow-card
                   transition-all duration-200
                   outline-none focus-visible:ring-4 focus-visible:ring-mint/30"
      >
        <ArrowLeft className="w-4 h-4" /> {label}
      </Link>
    </div>
  );
}

/**
 * Título de seção das telas do hub. Fecha com o ponto em menta, a mesma
 * assinatura dos títulos de aba do validador (`PageTitle`).
 */
export function HubTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div>
      <h2 className="font-serif text-3xl font-black text-deep">
        {children}
        <span className="text-mint">.</span>
      </h2>
      {sub && <p className="text-sm text-ink/60 mt-1.5">{sub}</p>}
    </div>
  );
}
