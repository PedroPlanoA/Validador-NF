import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "solid" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-mint text-deep hover:bg-mint-400",
  // Menta escura com texto branco — usada quando a ação precisa de tipografia
  // branca (pedido do usuário no botão de importar); mint-600 garante contraste
  // suficiente com o branco, o que o mint puro não daria.
  solid: "bg-mint-600 text-white hover:bg-mint-700",
  ghost: "border border-ink/15 text-ink hover:border-mint hover:text-mint-700",
  danger: "bg-danger text-white hover:brightness-95",
};

/** `sm` para botão dentro de balão/modal, onde o tamanho cheio pesa. Prop (e não
 *  classe por fora) pelo mesmo motivo do `fieldSize` em Input/Select. */
const SIZE_CLASSES = {
  md: "text-sm px-6 py-3",
  sm: "text-[13px] px-4 py-2",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof SIZE_CLASSES;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center gap-2 font-semibold rounded-pill transition-colors outline-none focus-visible:ring-4 focus-visible:ring-mint/30 disabled:opacity-50 disabled:cursor-not-allowed ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
