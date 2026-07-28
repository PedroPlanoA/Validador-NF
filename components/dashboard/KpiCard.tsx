import Link from "next/link";
import { Card } from "@/components/ui/Card";

const ACCENT_CLASSES: Record<string, string> = {
  primary: "bg-primary",
  positive: "bg-positive",
  attention: "bg-attention",
  danger: "bg-danger",
  neutral: "bg-ink/30",
};

export function KpiCard({
  label,
  value,
  sub,
  accent = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: keyof typeof ACCENT_CLASSES;
  href?: string;
}) {
  const content = (
    <>
      <div className={`absolute top-0 left-0 w-1.5 h-full ${ACCENT_CLASSES[accent]}`} />
      <span className="text-[10px] text-ink/40 font-bold uppercase tracking-wider">{label}</span>
      <h3 className="font-serif font-black text-2xl text-deep mt-1">{value}</h3>
      {sub && <span className="text-xs text-ink/50 font-semibold block mt-1">{sub}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href}>
        <Card className="p-5 relative overflow-hidden hover:shadow-card-hover transition-shadow cursor-pointer">
          {content}
        </Card>
      </Link>
    );
  }

  return <Card className="p-5 relative overflow-hidden">{content}</Card>;
}
