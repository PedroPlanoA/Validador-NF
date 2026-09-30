/**
 * A sessão: um cookie assinado, sem tabela de sessões.
 *
 * O cookie carrega o e-mail e o vencimento, e uma assinatura HMAC por cima.
 * Sem consulta ao banco a cada página — o que importa aqui porque o `proxy`
 * roda antes de **toda** requisição e não deveria abrir conexão com o Postgres
 * para carregar um CSS.
 *
 * Usa **Web Crypto**, não `node:crypto`, justamente para poder ser verificado
 * dentro do `proxy`, que não roda no runtime do Node.
 *
 * Revogar alguém é tirá-lo da lista de autorizados: o cookie dele continua
 * válido até vencer, mas qualquer ação que confira a autorização o barra. Para
 * um sistema interno de um escritório, esse é o balanço certo entre simplicidade
 * e controle — ver a ressalva em LOGICA.md.
 */

export const COOKIE_SESSAO = "hub_sessao";

/** Sete dias. Longo o bastante para não pedir código toda semana de trabalho,
 *  curto o bastante para que uma máquina esquecida não fique aberta para sempre. */
export const DURACAO_SESSAO_S = 7 * 24 * 60 * 60;

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET ausente ou curto demais (mínimo 32 caracteres).");
  }
  return s;
}

const enc = new TextEncoder();

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function assinar(payload: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw",
    enc.encode(segredo()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(await crypto.subtle.sign("HMAC", chave, enc.encode(payload)));
}

/** `<email em base64url>.<vencimento>.<assinatura>` */
export async function criarCookie(email: string): Promise<string> {
  const expiraEm = Math.floor(Date.now() / 1000) + DURACAO_SESSAO_S;
  const corpo = `${base64url(enc.encode(email))}.${expiraEm}`;
  return `${corpo}.${await assinar(corpo)}`;
}

/** O e-mail do cookie, ou `null` se estiver ausente, adulterado ou vencido. */
export async function lerCookie(valor: string | undefined): Promise<string | null> {
  if (!valor) return null;

  const partes = valor.split(".");
  if (partes.length !== 3) return null;

  const [emailB64, expiraEm, assinatura] = partes;
  const corpo = `${emailB64}.${expiraEm}`;

  let esperada: string;
  try {
    esperada = await assinar(corpo);
  } catch {
    // Sem AUTH_SECRET não há sessão válida — melhor barrar do que deixar passar.
    return null;
  }

  // Comparação de tamanho constante: comparar com `!==` vazaria, pelo tempo,
  // quantos caracteres do início bateram.
  if (assinatura.length !== esperada.length) return null;
  let diferenca = 0;
  for (let i = 0; i < assinatura.length; i++) {
    diferenca |= assinatura.charCodeAt(i) ^ esperada.charCodeAt(i);
  }
  if (diferenca !== 0) return null;

  if (Number(expiraEm) * 1000 < Date.now()) return null;

  try {
    const bin = atob(emailB64.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}
