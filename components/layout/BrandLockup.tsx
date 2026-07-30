const SIZES = {
  md: {
    logo: "h-11 w-11",
    name: "text-[17px]",
    tag: "text-[8px]",
    gap: "gap-3",
  },
  lg: {
    logo: "h-16 w-16",
    name: "text-[30px]",
    tag: "text-[10px]",
    gap: "gap-4",
  },
} as const;

/**
 * Assinatura da marca (símbolo + Plano A / Contabilidade), a mesma no painel de
 * empresas e dentro de cada empresa.
 *
 * O "CONTABILIDADE" segue exatamente o site institucional (plano-a-ux, nav
 * `.brand .name span`): peso **500**, `tracking` .24em, menta. Peso bold deixava
 * a palavra visivelmente mais pesada que o resto da interface, e
 * `subpixel-antialiased` a destacava ainda mais do alisamento usado no restante
 * da página — os dois foram removidos de propósito.
 */
export function BrandLockup({ size = "md" }: { size?: keyof typeof SIZES }) {
  const s = SIZES[size];

  return (
    <div className={`flex items-center ${s.gap}`}>
      <img src="/simbolo-cores.png" alt="Plano A" className={`${s.logo} object-contain shrink-0`} />
      <div className="min-w-0 leading-none">
        <div className={`font-serif font-black text-white ${s.name} leading-none`}>Plano A</div>
        <div className={`font-sans font-medium text-mint-300 uppercase tracking-[.24em] ${s.tag} mt-1.5 leading-none`}>
          Contabilidade
        </div>
      </div>
    </div>
  );
}
