import { ReactNode } from "react";

export type BadgeTone = "positive" | "attention" | "danger" | "primary" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  positive: "bg-positive/14 text-mint-700",
  attention: "bg-attention/14 text-clay-700",
  danger: "bg-danger/12 text-danger",
  primary: "bg-primary/12 text-teal",
  neutral: "bg-ink/7 text-ink/60",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-pill whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
