/**
 * Esqueleto de carregamento.
 *
 * Existe por causa de como o App Router navega: ao clicar numa aba, a página só
 * troca quando o servidor termina. Sem um `loading.tsx`, a tela **anterior**
 * fica congelada nesse intervalo, sem nenhum sinal de que algo aconteceu — e um
 * segundo de tela imóvel depois de um clique é lido como travamento, não como
 * espera. Com ele, a troca é imediata e a espera fica visível e explicada.
 *
 * Não acelera nada. Muda o que a pessoa vê enquanto espera, que é metade da
 * sensação de lentidão.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-ink/8 rounded ${className}`} />;
}

/** Cabeçalho de aba: título e ação. */
export function SkeletonCabecalho() {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-11 w-44 rounded-pill" />
    </div>
  );
}

/** Faixa de indicadores do dashboard. */
export function SkeletonKpis({ quantos = 4 }: { quantos?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: quantos }).map((_, i) => (
        <div key={i} className="bg-white rounded-card-sm border border-ink/5 shadow-card p-6 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Tabela: cabeçalho e linhas. */
export function SkeletonTabela({ linhas = 8 }: { linhas?: number }) {
  return (
    <div className="bg-white rounded-card-sm border border-ink/5 shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-ink/8 bg-paper-alt/40">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-ink/5">
        {Array.from({ length: linhas }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-6">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
