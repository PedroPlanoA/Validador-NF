"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { CAMPOS_PADRAO } from "@/lib/diario/campos";
import type { Bloco, ConfigFicha, Diario } from "@/lib/diario/armazenamento";

const ID_CONFIG = "global";

const chaveSchema = z.string().regex(/^\d{11,14}$/, "Identificador de cliente inválido.");

const blocoSchema = z.object({
  id: z.string().min(1).max(64),
  tipo: z.enum(["secao", "topico", "subtopico", "anotacao", "dica", "importante", "alerta"]),
  texto: z.string().max(20_000),
  criadoEm: z.string().max(40),
  atualizadoEm: z.string().max(40),
});

const blocosSchema = z.array(blocoSchema).max(2_000);

const configSchema = z.object({
  campos: z.array(z.string().max(120)).max(200),
  departamentos: z.array(z.string().max(120)).max(200).nullable().optional(),
});

export async function obterConfigDiario(): Promise<ConfigFicha> {
  const c = await db.diarioConfig.findUnique({ where: { id: ID_CONFIG } });
  if (!c) return { campos: CAMPOS_PADRAO, departamentos: null };
  return {
    campos: c.campos as string[],
    departamentos: (c.departamentos as string[] | null) ?? null,
  };
}

export async function salvarConfigDiario(entrada: ConfigFicha): Promise<void> {
  const { campos, departamentos } = configSchema.parse(entrada);
  // `undefined` no Prisma é "não mexer"; "todos os departamentos" precisa ser nulo explícito.
  const dados = { campos, departamentos: departamentos ?? Prisma.DbNull };
  await db.diarioConfig.upsert({
    where: { id: ID_CONFIG },
    create: { id: ID_CONFIG, ...dados },
    update: dados,
  });
}

/** Diário como está no banco. `versao` é o `updatedAt` da linha (nulo = ainda não existe). */
export type DiarioRemoto = Diario & { versao: string | null };

export type ResultadoSalvarDiario = { ok: true; versao: string } | { conflito: true; atual: DiarioRemoto };

export async function obterDiario(chave: string): Promise<DiarioRemoto> {
  const d = await db.diarioCliente.findUnique({ where: { chave: chaveSchema.parse(chave) } });
  if (!d) return { blocos: [], atualizadoEm: null, versao: null };
  const versao = d.updatedAt.toISOString();
  return { blocos: d.blocos as unknown as Bloco[], atualizadoEm: versao, versao };
}

/**
 * Grava o diário inteiro do cliente, com controle de edição simultânea.
 *
 * `versaoBase` é a versão que quem edita tinha carregado. A gravação só vale se
 * o banco ainda estiver nela; se outra pessoa salvou antes, nada é gravado e a
 * versão atual volta em `conflito`, para a tela perguntar o que fazer. A
 * comparação é feita dentro do próprio UPDATE (`where` com `updatedAt`), então
 * não há janela entre conferir e gravar.
 */
export async function salvarDiario(
  chave: string,
  blocos: Bloco[],
  versaoBase: string | null,
): Promise<ResultadoSalvarDiario> {
  const k = chaveSchema.parse(chave);
  const b = blocosSchema.parse(blocos);
  const dados = {
    blocos: b,
    alertas: b.filter((x) => x.tipo === "alerta" && x.texto.trim()).length,
    totalBlocos: b.length,
  };
  try {
    const d = versaoBase
      ? await db.diarioCliente.update({ where: { chave: k, updatedAt: new Date(versaoBase) }, data: dados })
      : await db.diarioCliente.create({ data: { chave: k, ...dados } });
    return { ok: true, versao: d.updatedAt.toISOString() };
  } catch (e) {
    // P2025: nenhuma linha na versão esperada (alguém salvou antes).
    // P2002: o diário ainda não existia para esta pessoa, mas outra já o criou.
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2025" || e.code === "P2002")) {
      return { conflito: true, atual: await obterDiario(k) };
    }
    throw e;
  }
}

/** Contagens de todos os diários, para os selos dos cards da lista de clientes. */
export async function resumoDiarios(): Promise<Record<string, { alertas: number; blocos: number }>> {
  const linhas = await db.diarioCliente.findMany({
    where: { totalBlocos: { gt: 0 } },
    select: { chave: true, alertas: true, totalBlocos: true },
  });
  return Object.fromEntries(linhas.map((l) => [l.chave, { alertas: l.alertas, blocos: l.totalBlocos }]));
}
