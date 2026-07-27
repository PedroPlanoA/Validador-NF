import { Card } from "@/components/ui/Card";

const ACCENT_CLASSES: Record<string, string> = {
  indigo: "bg-status-info",
  emerald: "bg-status-success",
  amber: "bg-status-warning",
  rose: "bg-status-error",
  clay: "bg-status-warning-warm",
  neutral: "bg-ink/30",
};

export function KpiCard({
  label,
  value,
  sub,
  accent = "neutral",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: keyof typeof ACCENT_CLASSES;
}) {
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${ACCENT_CLASSES[accent]}`} />
      <span className="text-[10px] text-ink/40 font-bold uppercase tracking-wider">{label}</span>
      <h3 className="text-2xl font-extrabold text-ink mt-1">{value}</h3>
      {sub && <span className="text-xs text-ink/50 font-semibold block mt-1">{sub}</span>}
    </Card>
  );
}
