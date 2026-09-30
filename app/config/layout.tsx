import { ConfigTabs } from "@/components/layout/ConfigTabs";
import { ConfigBackLink } from "@/components/layout/ConfigBackLink";
import { ehMaster } from "@/lib/auth/autorizados";
import { emailDaSessao } from "@/lib/actions/usuarios";

export default async function ConfigLayout({ children }: { children: React.ReactNode }) {
  const email = await emailDaSessao();

  return (
    <div className="flex h-full w-full overflow-hidden flex-1 flex-col bg-paper">
      <header className="h-16 flex items-center px-8 border-b border-ink/8 bg-white shrink-0 gap-6">
        <ConfigBackLink />
        <div className="h-6 w-px bg-ink/10" />
        {/* O título deixou de falar só em mapeamentos quando a aba de usuários
            entrou aqui — era o lugar natural dela, e o nome ficou estreito. */}
        <h1 className="font-serif font-black text-base text-ink">Configuração Global</h1>
      </header>
      <div className="px-8 pt-6">
        <ConfigTabs mostrarUsuarios={ehMaster(email ?? "")} />
      </div>
      <div className="flex-1 overflow-y-auto p-8 pt-4">{children}</div>
    </div>
  );
}
