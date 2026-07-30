"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartPie,
  FileSpreadsheet,
  ShoppingCart,
  FileText,
  AlertTriangle,
  ListChecks,
  Package,
} from "lucide-react";
import { CompetenciaSidebarSelect } from "@/components/layout/CompetenciaSidebarSelect";
import { BrandLockup } from "@/components/layout/BrandLockup";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Ordem definida pelo usuário: segue o fluxo real de trabalho — olhar o
 *  panorama, conferir vendas e notas, ajustar produtos, tratar erros, fechar o
 *  checklist e só então voltar às importações. */
function navItems(companyId: string): NavItem[] {
  return [
    { href: `/c/${companyId}/dashboard`, label: "Dashboard", icon: ChartPie },
    { href: `/c/${companyId}/sales`, label: "Vendas", icon: ShoppingCart },
    { href: `/c/${companyId}/invoices`, label: "Notas Fiscais", icon: FileText },
    { href: `/c/${companyId}/products`, label: "Produtos", icon: Package },
    { href: `/c/${companyId}/errors`, label: "Painel de Erros", icon: AlertTriangle },
    { href: `/c/${companyId}/checklist`, label: "Checklist", icon: ListChecks },
    { href: `/c/${companyId}/imports`, label: "Importações", icon: FileSpreadsheet },
  ];
}

/** Pattern from plano-a-ux/references/components.md `.side a` — border-left
 *  indicator instead of a full-width fill, so the active item reads clearly
 *  without competing with the dark sidebar background. */
const NAV_LINK_BASE =
  "w-full flex items-center gap-3 px-3 py-2.5 pl-3 border-l-[3px] rounded-r-card-sm text-sm transition-colors";
const NAV_LINK_ACTIVE = "border-l-mint bg-mint/12 text-white font-semibold";
const NAV_LINK_INACTIVE = "border-l-transparent text-sand/80 hover:bg-white/5 hover:text-white font-medium";

export const SIDEBAR_WIDTH_CLASS = "w-64";

export function Sidebar({
  companyId,
  companyName,
  companyCodigo,
  companyCnpj,
  competencias,
  currentCompetencia,
}: {
  companyId: string;
  companyName: string;
  companyCodigo: string;
  companyCnpj: string;
  competencias: string[];
  currentCompetencia?: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    // Fixa de propósito: a faixa lateral não pode crescer, encolher nem rolar
    // junto com o conteúdo da aba — só a área de conteúdo se move.
    <aside
      className={`fixed top-0 left-0 z-40 h-dvh ${SIDEBAR_WIDTH_CLASS} bg-deep text-white flex flex-col border-r border-black/20`}
    >
      <div className="px-5 py-4 border-b border-white/10 shrink-0">
        <BrandLockup size="md" />
      </div>

      {/* Bloco da empresa — o dado mais importante da tela inteira, então tem
          respiro próprio, hierarquia (código, nome, CNPJ) e fundo levemente
          destacado em vez de um nome truncado dentro do cabeçalho da marca.
          Mesma tipografia dos cards da tela de empresas: nome em sans, verde
          claro. */}
      <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] shrink-0">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-sand/45">
          <span className="w-4 h-px bg-sand/30" /> Código {companyCodigo}
        </span>
        <h2
          className="font-sans font-semibold text-[17px] leading-snug text-mint-300 mt-2 line-clamp-2"
          title={companyName}
        >
          {companyName}
        </h2>
        <p className="text-[11px] font-medium text-sand/50 mt-1.5 tabular-nums">{companyCnpj}</p>
      </div>

      <div className="pt-4 shrink-0">
        <CompetenciaSidebarSelect
          companyId={companyId}
          competencias={competencias}
          current={currentCompetencia}
        />
      </div>

      <nav className="scroll-dark flex-1 px-4 pb-6 space-y-1 overflow-y-auto border-t border-white/10 pt-4">
        {navItems(companyId).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${NAV_LINK_BASE} ${isActive(href) ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
          >
            <Icon className="w-4 h-4 shrink-0" /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
