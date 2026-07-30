import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";

const FIELD_BASE =
  "w-full border border-ink/10 rounded-input outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint transition-all bg-white";

/** Duas densidades. `sm` é para campos empilhados dentro de um balão/modal, onde
 *  a altura de formulário cheio empurra tudo para baixo.
 *
 *  Existe como prop (e não como classe passada em `className`) porque conflito
 *  de utilitário Tailwind é resolvido pela ordem na folha gerada, não pela ordem
 *  no atributo: `px-3` passado por fora perderia para o `px-4` daqui. */
const FIELD_SIZES = {
  md: "px-4 py-2.5 text-sm",
  sm: "px-3 py-2 text-[13px]",
} as const;

/** Renomeado de `size` porque `size` já é atributo de `<input>`/`<select>`. */
type WithFieldSize = { fieldSize?: keyof typeof FIELD_SIZES };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & WithFieldSize>(
  ({ className = "", fieldSize = "md", ...props }, ref) => (
    <input ref={ref} className={`${FIELD_BASE} ${FIELD_SIZES[fieldSize]} ${className}`} {...props} />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & WithFieldSize>(
  ({ className = "", fieldSize = "md", children, ...props }, ref) => (
    <select
      ref={ref}
      className={`${FIELD_BASE} ${FIELD_SIZES[fieldSize]} cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-bold text-ink/70 uppercase tracking-wide">{children}</label>;
}

/** Rótulo miúdo para campo dentro de balão/modal — nomeia a dimensão sem roubar
 *  espaço vertical do campo em si. */
export function FieldCaption({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] font-bold uppercase tracking-[.12em] text-ink/45">{children}</span>
  );
}
