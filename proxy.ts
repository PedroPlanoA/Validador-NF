import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESSAO, lerCookie } from "@/lib/auth/sessao";

/**
 * Porta de entrada do Hub: sem sessão válida, nada passa.
 *
 * No Next 16 este arquivo se chama `proxy.ts` — o `middleware.ts` que a maioria
 * da documentação na internet ainda mostra foi **renomeado** e não é mais lido.
 *
 * Aqui só se confere a **assinatura do cookie**, sem tocar no banco: isto roda
 * antes de toda requisição, e abrir conexão com o Postgres para servir um CSS
 * seria caro à toa. Quem é autorizado *agora* é conferido nas ações que
 * importam (pedir código, entrar, e a tela de usuários).
 */
export async function proxy(request: NextRequest) {
  const email = await lerCookie(request.cookies.get(COOKIE_SESSAO)?.value);
  if (email) return NextResponse.next();

  // Requisição de API responde 401; só navegação é redirecionada, senão um
  // `fetch` receberia o HTML da tela de login como se fosse a resposta da API.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const destino = new URL("/login", request.url);
  // Para voltar ao que a pessoa tentou abrir depois de entrar. Só o caminho,
  // nunca uma URL absoluta — senão vira redirecionamento aberto para fora.
  const voltarPara = request.nextUrl.pathname + request.nextUrl.search;
  if (voltarPara !== "/") destino.searchParams.set("de", voltarPara);
  return NextResponse.redirect(destino);
}

export const config = {
  /**
   * Tudo, menos:
   *  - a própria tela de login e as rotas de autenticação (senão ninguém entra);
   *  - os estáticos do Next e o favicon — sem esta exclusão, a tela de login
   *    apareceria sem CSS, porque o próprio CSS seria redirecionado para ela.
   *  - `extrator/`, de onde os extratores instalados nas máquinas baixam as
   *    próprias atualizações. Eles não têm sessão do Hub e não têm como ter: são
   *    um processo local, sem ninguém logado dentro. O que mora ali é só o
   *    código da ferramenta, que não carrega segredo nenhum — nem certificado,
   *    nem senha, nem chave — e isso é invariante do projeto, não sorte.
   *
   * A barra em `extrator/` não é detalhe: sem ela, `/extrator-nacional` — a
   * página do Hub que abre a ferramenta — também passaria a ser pública.
   */
  matcher: ["/((?!login|api/auth|extrator/|_next/static|_next/image|favicon.ico).*)"],
};
