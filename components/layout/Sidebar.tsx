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
  Server,
  ListChecks,
  Building2,
} from "lucide-react";

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
    { href: `/c/${companyId}/invoices`, label: "Notas Fiscais", icon: FileText },
    { href: `/c/${companyId}/errors`, label: "Painel de Erros", icon: AlertTriangle },
  ];
}

function configItems(companyId: string): NavItem[] {
  return [
    { href: `/c/${companyId}/config/platforms`, label: "Mapear Plataformas", icon: SlidersHorizontal },
    { href: `/c/${companyId}/config/emitters`, label: "Mapear Emissores", icon: Server },
  ];
}

export function Sidebar({ companyId, companyName }: { companyId: string; companyName: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-64 bg-deep text-white flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-white/10 gap-3">
        <div className="w-8 h-8 rounded-lg bg-mint flex items-center justify-center shadow-md shrink-0">
          <span className="text-deep font-black text-lg font-serif">A</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-serif font-black text-base leading-tight truncate">{companyName}</h1>
          <Link href="/companies" className="text-[10px] text-mint-300 hover:text-mint-200 uppercase tracking-wide">
            Trocar empresa
          </Link>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems(companyId).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-card-sm text-sm font-medium transition-colors ${
              isActive(href) ? "bg-deep-dark text-mint-300" : "text-sand/80 hover:bg-deep-dark hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" /> {label}
          </Link>
        ))}

        <div className="pt-4 mt-4 border-t border-white/10">
          <span className="px-3 text-[10px] font-bold text-sand/50 uppercase tracking-wider block mb-2">
            Configuração
          </span>
          {configItems(companyId).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-card-sm text-sm font-medium transition-colors ${
                isActive(href) ? "bg-deep-dark text-mint-300" : "text-sand/80 hover:bg-deep-dark hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" /> {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-white/10 text-xs text-sand/50 flex items-center gap-2">
        <Building2 className="w-3.5 h-3.5" /> Plano A Contabilidade
      </div>
    </aside>
  );
}
