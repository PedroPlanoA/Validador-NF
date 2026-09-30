import "server-only";
import { db } from "@/lib/db";

/**
 * Quem pode entrar no Hub.
 *
 * Dois níveis:
 *
 * - **Masters** — fixos aqui, no código. São a raiz de confiança: quem libera
 *   os outros. Ficarem no banco criaria um ciclo (quem autoriza o primeiro?) e,
 *   pior, permitiria que uma falha da aplicação promovesse alguém a master.
 *   Mudar esta lista é uma alteração de código, revisada e com histórico —
 *   que é exatamente o peso que essa mudança deve ter.
 * - **Autorizados** — na tabela `UsuarioAutorizado`, liberados por um master
 *   pela tela de usuários.
 */
const MASTERS = [
  "matheus@planoacontabilidade.com.br",
  "fiscal4@planoacontabilidade.com.br",
  "fiscal2@planoacontabilidade.com.br",
] as const;

/** E-mail é caixa-insensível na prática; normalizar evita que "Fiscal4@…" seja
 *  tratado como outra pessoa e fique de fora da lista. */
export function normalizarEmail(email: string): string {
  return (email ?? "").trim().toLowerCase();
}

export function ehMaster(email: string): boolean {
  return (MASTERS as readonly string[]).includes(normalizarEmail(email));
}

/** Masters entram sempre, mesmo sem linha no banco. */
export async function ehAutorizado(email: string): Promise<boolean> {
  const e = normalizarEmail(email);
  if (!e) return false;
  if (ehMaster(e)) return true;

  const achado = await db.usuarioAutorizado.findUnique({ where: { email: e } });
  return achado !== null;
}

/** A lista da tela de usuários: masters primeiro, marcados, depois os liberados. */
export async function listarAutorizados() {
  const doBanco = await db.usuarioAutorizado.findMany({ orderBy: { email: "asc" } });
  return {
    masters: [...MASTERS],
    autorizados: doBanco,
  };
}
