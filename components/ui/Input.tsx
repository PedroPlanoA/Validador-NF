import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";

const FIELD_CLASSES =
  "w-full px-4 py-2.5 text-sm border border-ink/10 rounded-input outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint transition-all bg-white";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input ref={ref} className={`${FIELD_CLASSES} ${className}`} {...props} />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select ref={ref} className={`${FIELD_CLASSES} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-bold text-ink/70 uppercase tracking-wide">{children}</label>;
}
