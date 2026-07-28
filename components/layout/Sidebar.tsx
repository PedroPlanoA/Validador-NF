"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartPie,
  FileSpreadsheet,
  ShoppingCart,
  FileText,
  AlertTriangle,
  SlidersHorizontal,
  ListChecks,
  Package,
  Building2,
} from "lucide-react";
import { CompetenciaSidebarSelect } from "@/components/layout/CompetenciaSidebarSelect";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function navItems(companyId: string): NavItem[] {
  return [
    { href: `/c/${companyId}/dashboard`, label: "Dashboard", icon: ChartPie },
    { href: `/c/${companyId}/checklist`, label: "Checklist", icon: ListChecks },
    { href: `/c/${companyId}/imports`, label: "Importações", icon: FileSpreadsheet },
    { href: `/c/${companyId}/sales`, label: "Vendas", icon: ShoppingCart },
    { href: `/c/${companyId}/products`, label: "Produtos", icon: Package },
    { href: `/c/${companyId}/invoices`, label: "Notas Fiscais", icon: FileText },
    { href: `/c/${companyId}/errors`, label: "Painel de Erros", icon: AlertTriangle },
  ];
}

/** Pattern from plano-a-ux/references/components.md `.side a` — border-left
 *  indicator instead of a full-width fill, so the active item reads clearly
 *  without competing with the dark sidebar background. */
const NAV_LINK_BASE =
  "w-full flex items-center gap-3 px-3 py-2.5 pl-3 border-l-[3px] rounded-r-card-sm text-sm transition-colors";
const NAV_LINK_ACTIVE = "border-l-mint bg-mint/12 text-white font-semibold";
const NAV_LINK_INACTIVE = "border-l-transparent text-sand/80 hover:bg-white/5 hover:text-white font-medium";

export function Sidebar({
  companyId,
  companyName,
  competencias,
  currentCompetencia,
}: {
  companyId: string;
  companyName: string;
  competencias: string[];
  currentCompetencia?: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-64 bg-deep text-white flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-white/10 gap-3">
        <img src="/simbolo-cores.png" alt="Plano A" className="h-9 w-9 object-contain shrink-0" />
        <div className="min-w-0">
          <h1 className="font-serif font-black text-base leading-tight truncate">{companyName}</h1>
          <Link href="/companies" className="text-[10px] text-mint-300 hover:text-mint-200 uppercase tracking-wide">
            Trocar empresa
          </Link>
        </div>
      </div>

      <div className="pt-4 border-b border-white/10">
        <CompetenciaSidebarSelect
          companyId={companyId}
          competencias={competencias}
          current={currentCompetencia}
        />
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems(companyId).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${NAV_LINK_BASE} ${isActive(href) ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
          >
            <Icon className="w-4 h-4 shrink-0" /> {label}
          </Link>
        ))}

        <div className="pt-4 mt-4 border-t border-white/10">
          <Link
            href={`/c/${companyId}/config/platforms`}
            className={`${NAV_LINK_BASE} ${isActive(`/c/${companyId}/config`) ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" /> Mapear
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-white/10 text-xs text-sand/50 flex items-center gap-2">
        <Building2 className="w-3.5 h-3.5" /> Plano A Contabilidade
      </div>
    </aside>
  );
}
