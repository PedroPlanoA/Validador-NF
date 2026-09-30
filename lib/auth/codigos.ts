import "server-only";
import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { normalizarEmail } from "./autorizados";

/** Dez minutos: tempo de abrir o e-mail e copiar, sem deixar um código antigo
 *  válido numa caixa de entrada pelo resto do dia. */
const VALIDADE_MIN = 10;

/** Cinco erros e o código morre. Sem isso, seis dígitos caem por tentativa e
 *  erro em minutos. */
const MAX_TENTATIVAS = 5;

/** Quantos códigos um e-mail pode pedir em 15 minutos, para o Hub não virar
 *  ferramenta de encher a caixa de entrada de alguém. */
const MAX_PEDIDOS = 5;
const JANELA_PEDIDOS_MIN = 15;

/** Hash simples (sem sal) de propósito: o segredo tem 6 dígitos e vive 10
 *  minutos, então o que importa é não guardar o código em claro. Um bcrypt aqui
 *  só acrescentaria latência. */
const hash = (codigo: string) => createHash("sha256").update(codigo).digest("hex");

/** `randomInt` e não `Math.random`: código de acesso é segredo, e precisa vir de
 *  gerador criptográfico. */
function sortearCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export class PedidosDemais extends Error {
  constructor() {
    super("Você pediu códigos demais. Espere alguns minutos e tente de novo.");
    this.name = "PedidosDemais";
  }
}

/** Cria o código, guarda o hash e devolve o código em claro — que só o e-mail
 *  vai ver. Invalida os anteriores: dois códigos válidos ao mesmo tempo
 *  confundem quem recebe e ampliam a janela de ataque. */
export async function gerarCodigo(email: string): Promise<string> {
  const e = normalizarEmail(email);

  const desde = new Date(Date.now() - JANELA_PEDIDOS_MIN * 60_000);
  const recentes = await db.codigoAcesso.count({ where: { email: e, createdAt: { gte: desde } } });
  if (recentes >= MAX_PEDIDOS) throw new PedidosDemais();

  await db.codigoAcesso.deleteMany({ where: { email: e, usadoEm: null } });

  const codigo = sortearCodigo();
  await db.codigoAcesso.create({
    data: {
      email: e,
      codigoHash: hash(codigo),
      expiraEm: new Date(Date.now() + VALIDADE_MIN * 60_000),
    },
  });

  return codigo;
}

/**
 * Confere o código. Devolve `true` uma única vez — o código é queimado no
 * sucesso, e a tentativa é contada no erro.
 */
export async function conferirCodigo(email: string, codigo: string): Promise<boolean> {
  const e = normalizarEmail(email);
  const limpo = (codigo ?? "").replace(/\D/g, "");
  if (limpo.length !== 6) return false;

  const registro = await db.codigoAcesso.findFirst({
    where: { email: e, usadoEm: null, expiraEm: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!registro) return false;

  if (registro.tentativas >= MAX_TENTATIVAS) {
    await db.codigoAcesso.delete({ where: { id: registro.id } });
    return false;
  }

  if (registro.codigoHash !== hash(limpo)) {
    await db.codigoAcesso.update({
      where: { id: registro.id },
      data: { tentativas: { increment: 1 } },
    });
    return false;
  }

  // `usadoEm` marcado dentro de um update condicional: se duas requisições
  // chegarem com o mesmo código, só a primeira encontra a linha ainda não usada.
  const queimado = await db.codigoAcesso.updateMany({
    where: { id: registro.id, usadoEm: null },
    data: { usadoEm: new Date() },
  });
  return queimado.count === 1;
}

/** Limpa o que já não serve. Chamado ao pedir código — barato e mantém a tabela
 *  pequena sem depender de tarefa agendada. */
export async function limparVencidos(): Promise<void> {
  await db.codigoAcesso.deleteMany({
    where: { OR: [{ expiraEm: { lt: new Date() } }, { usadoEm: { not: null } }] },
  });
}
