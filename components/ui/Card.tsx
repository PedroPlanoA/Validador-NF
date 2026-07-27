import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white rounded-card-sm border border-ink/5 shadow-card ${className}`}
      {...props}
    />
  );
}
