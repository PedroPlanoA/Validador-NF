/** Título de aba/página no contexto Sistema. Caixa alta foi abandonada: só a
 *  inicial é maiúscula e o título fecha com ponto — o ponto em menta é a
 *  assinatura da marca aplicada em escala pequena (plano-a-ux: menta é acento,
 *  aparece em pouca área). */
export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="min-w-0">
      <h1 className="font-serif font-black text-2xl md:text-[1.75rem] leading-tight tracking-[-0.02em] text-deep">
        {children}
        <span className="text-mint">.</span>
      </h1>
      {sub && <p className="text-sm text-text-2 mt-1">{sub}</p>}
    </div>
  );
}

/** Cabeçalho padrão de página: título à esquerda, ação à direita. Centralizar
 *  esse arranjo evita que cada aba invente um alinhamento diferente. */
export function PageHeader({
  title,
  sub,
  children,
}: {
  title: React.ReactNode;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <PageTitle sub={sub}>{title}</PageTitle>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
