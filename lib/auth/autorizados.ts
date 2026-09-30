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

/**
 * A lista da tela de usuários, com o último acesso de cada um.
 *
 * O último acesso responde a pergunta que a lista sozinha não responde: quem
 * ainda usa, quem foi liberado e nunca entrou, e de quem dá para tirar o acesso
 * sem atrapalhar ninguém.
 */
export async function listarAutorizados() {
  const [doBanco, acessos] = await Promise.all([
    db.usuarioAutorizado.findMany({ orderBy: { email: "asc" } }),
    db.acessoUsuario.findMany(),
  ]);

  const ultimo = new Map(acessos.map((a) => [a.email, a.ultimoEm]));
  return {
    masters: MASTERS.map((email) => ({ email, ultimoEm: ultimo.get(email) ?? null })),
    autorizados: doBanco.map((u) => ({ ...u, ultimoEm: ultimo.get(u.email) ?? null })),
  };
}
