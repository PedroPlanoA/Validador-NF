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

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-pill transition-colors outline-none focus-visible:ring-4 focus-visible:ring-mint/30 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
