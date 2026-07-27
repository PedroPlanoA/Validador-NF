import { ReactNode } from "react";

export type BadgeTone = "success" | "error" | "warning" | "warning-warm" | "info" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-status-success/12 text-status-success",
  error: "bg-status-error/12 text-status-error",
  warning: "bg-status-warning/12 text-status-warning",
  "warning-warm": "bg-status-warning-warm/15 text-status-warning-warm",
  info: "bg-status-info/12 text-status-info",
  neutral: "bg-ink/8 text-ink/60",
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
