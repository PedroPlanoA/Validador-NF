import Link from "next/link";
import { Settings, SlidersHorizontal, ArrowLeftRight } from "lucide-react";
import { FAB_BUTTON_CLASS, FAB_ICON_CLASS, FAB_ITEM_CLASS, FAB_MENU_CLASS } from "@/components/ui/Fab";

/** Ações que não pertencem ao fluxo de conferência (mapear colunas, trocar de
 *  empresa) saíram do menu lateral para este botão flutuante — mesmo padrão da
 *  tela de empresas, para o menu lateral conter só as abas de trabalho.
 *
 *  Abre no hover, em CSS puro: sem estado nem efeito, o menu não pode ficar
 *  preso aberto depois de uma navegação. */
export function CompanyFab({ companyId }: { companyId: string }) {
  return (
    <div className="group fixed bottom-6 right-6 z-40">
      <div className={FAB_MENU_CLASS}>
        <div className="bg-white border border-ink/10 shadow-card-hover rounded-card-sm py-2 w-56">
          <Link href={`/c/${companyId}/config/platforms`} className={FAB_ITEM_CLASS}>
            <SlidersHorizontal className="w-4 h-4 text-teal" /> Mapear
          </Link>
          <Link href="/companies" className={FAB_ITEM_CLASS}>
            <ArrowLeftRight className="w-4 h-4 text-mint-600" /> Trocar Empresa
          </Link>
        </div>
      </div>
      <button className={FAB_BUTTON_CLASS} aria-label="Ações" title="Ações">
        <Settings className={FAB_ICON_CLASS} />
      </button>
    </div>
  );
}
