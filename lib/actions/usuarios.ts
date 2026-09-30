"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ehMaster, normalizarEmail } from "@/lib/auth/autorizados";
import { COOKIE_SESSAO, lerCookie } from "@/lib/auth/sessao";

/** O e-mail de quem está logado, ou `null`. */
export async function emailDaSessao(): Promise<string | null> {
  const c = await cookies();
  return lerCookie(c.get(COOKIE_SESSAO)?.value);
}

/**
 * Só master mexe na lista.
 *
 * Conferido **aqui dentro**, e não só ao desenhar a tela: Server Action é um
 * endpoint como outro qualquer, e esconder o botão não impede ninguém de chamar
 * a ação direto.
 */
async function exigirMaster(): Promise<string> {
  const email = await emailDaSessao();
  if (!email || !ehMaster(email)) {
    throw new Error("Só um administrador pode alterar a lista de usuários.");
  }
  return normalizarEmail(email);
}

export async function autorizarEmail(_estado: unknown, formData: FormData) {
  let master: string;
  try {
    master = await exigirMaster();
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const email = normalizarEmail(String(formData.get("email") ?? ""));
  const nome = String(formData.get("nome") ?? "").trim() || null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { erro: "Informe um e-mail válido." };
  }
  if (ehMaster(email)) {
    return { erro: "Esse e-mail já é administrador e entra sempre." };
  }

  await db.usuarioAutorizado.upsert({
    where: { email },
    update: { nome },
    create: { email, nome, criadoPor: master },
  });

  revalidatePath("/config/usuarios");
  return { ok: `${email} liberado.` };
}

export async function revogarEmail(_estado: unknown, formData: FormData) {
  try {
    await exigirMaster();
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const email = normalizarEmail(String(formData.get("email") ?? ""));
  await db.usuarioAutorizado.deleteMany({ where: { email } });

  revalidatePath("/config/usuarios");
  return { ok: `${email} removido.` };
}
