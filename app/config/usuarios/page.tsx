import { notFound } from "next/navigation";
import { ehMaster, listarAutorizados } from "@/lib/auth/autorizados";
import { emailDaSessao } from "@/lib/actions/usuarios";
import { UsuariosManager } from "@/components/config/UsuariosManager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const email = await emailDaSessao();
  // 404 e não uma mensagem de "sem permissão": para quem não é administrador,
  // esta tela não existe.
  if (!email || !ehMaster(email)) notFound();

  const { masters, autorizados } = await listarAutorizados();
  return <UsuariosManager masters={masters} autorizados={autorizados} />;
}
