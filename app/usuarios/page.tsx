import { notFound } from "next/navigation";
import { HubHeader, HubTitle, VoltarParaFerramentas } from "@/components/layout/HubHeader";
import { ehMaster, listarAutorizados } from "@/lib/auth/autorizados";
import { emailDaSessao } from "@/lib/actions/usuarios";
import { UsuariosManager } from "@/components/config/UsuariosManager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const email = await emailDaSessao();
  // 404 e não uma mensagem de "sem permissão": para quem não é administrador,
  // esta ferramenta não existe — nem no hub, nem pela URL.
  if (!email || !ehMaster(email)) notFound();

  const { masters, autorizados } = await listarAutorizados();

  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Usuários" />
      <VoltarParaFerramentas />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <HubTitle sub="Quem pode entrar no Hub. Só administradores veem esta tela.">
          Usuários
        </HubTitle>
        <UsuariosManager masters={masters} autorizados={autorizados} />
      </div>
    </main>
  );
}
