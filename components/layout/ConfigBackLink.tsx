import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ConfigBackLink() {
  return (
    <Link
      href="/companies"
      className="flex items-center gap-1.5 text-xs font-semibold text-ink/50 hover:text-mint transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> Empresas
    </Link>
  );
}
