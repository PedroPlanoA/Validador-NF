const SIZES = {
  md: {
    logo: "h-11 w-11",
    name: "text-[17px]",
    tag: "text-[8px] tracking-[.2em]",
    gap: "gap-3",
  },
  lg: {
    logo: "h-16 w-16",
    name: "text-[30px]",
    tag: "text-[10px] tracking-[.2em]",
    gap: "gap-4",
  },
} as const;

/**
 * Assinatura da marca (símbolo + Plano A / Contabilidade), a mesma no painel de
 * empresas e dentro de cada empresa.
 *
 * Dois detalhes deliberados no "CONTABILIDADE": entrelinha bem menor que a do
 * nome (o espaçamento largo fazia a palavra ficar mais comprida que "Plano A",
 * o que desequilibrava o conjunto) e `subpixel-antialiased`, que no Windows
 * devolve a nitidez que o alisamento em escala de cinza tira de texto pequeno
 * em caixa alta sobre fundo escuro.
 */
export function BrandLockup({ size = "md" }: { size?: keyof typeof SIZES }) {
  const s = SIZES[size];

  return (
    <div className={`flex items-center ${s.gap}`}>
      <img src="/simbolo-cores.png" alt="Plano A" className={`${s.logo} object-contain shrink-0`} />
      <div className="min-w-0 leading-none">
        <div className={`font-serif font-black text-white ${s.name} leading-none`}>Plano A</div>
        <div
          className={`font-sans font-bold text-mint-300 uppercase subpixel-antialiased ${s.tag} mt-1.5 leading-none`}
        >
          Contabilidade
        </div>
      </div>
    </div>
  );
}
