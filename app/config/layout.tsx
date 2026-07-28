import { ConfigTabs } from "@/components/layout/ConfigTabs";
import { ConfigBackLink } from "@/components/layout/ConfigBackLink";

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full overflow-hidden flex-1 flex-col bg-paper">
      <header className="h-16 flex items-center px-8 border-b border-ink/8 bg-white shrink-0 gap-6">
        <ConfigBackLink />
        <div className="h-6 w-px bg-ink/10" />
        <h1 className="font-serif font-black text-base text-ink">Configuração Global de Mapeamentos</h1>
      </header>
      <div className="px-8 pt-6">
        <ConfigTabs />
      </div>
      <div className="flex-1 overflow-y-auto p-8 pt-4">{children}</div>
    </div>
  );
}
