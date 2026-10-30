import "server-only";
import { db } from "@/lib/db";
import type { Arquivo, BaseTri, DadosObrigacoes } from "./tipos";

/** Arquivos do ICO Fiscal no banco. */

type Linha = Awaited<ReturnType<typeof db.icoArquivo.findMany>>[number];

function paraArquivo(l: Linha): Arquivo {
  const comum = { id: l.id, nome: l.nome, tag: l.tag, detalhe: l.detalhe, criadoEm: l.createdAt.toISOString() };
  return l.tipo === "base"
    ? { ...comum, tipo: "base", tri: l.tri ?? "SEM-DATA", dados: l.dados as unknown as BaseTri }
    : { ...comum, tipo: "obr", tri: null, dados: l.dados as unknown as DadosObrigacoes };
}

export async function listarArquivos(): Promise<Arquivo[]> {
  const linhas = await db.icoArquivo.findMany({ orderBy: { createdAt: "asc" } });
  return linhas.map(paraArquivo);
}

export type NovoArquivo =
  | { nome: string; tipo: "base"; tri: string; tag: string; detalhe: string; dados: BaseTri }
  | { nome: string; tipo: "obr"; tri: null; tag: string; detalhe: string; dados: DadosObrigacoes };

/** `null` se já existe um arquivo com esse nome. Base de um trimestre já lançado substitui a anterior. */
export async function adicionarArquivo(a: NovoArquivo): Promise<Arquivo | null> {
  if (await db.icoArquivo.findUnique({ where: { nome: a.nome }, select: { id: true } })) return null;
  if (a.tipo === "base") await db.icoArquivo.deleteMany({ where: { tipo: "base", tri: a.tri } });
  const l = await db.icoArquivo.create({
    data: { nome: a.nome, tipo: a.tipo, tri: a.tri, tag: a.tag, detalhe: a.detalhe, dados: a.dados as never },
  });
  return paraArquivo(l);
}

export async function removerArquivo(id: string): Promise<void> {
  await db.icoArquivo.deleteMany({ where: { id } });
}

export async function removerTodos(): Promise<void> {
  await db.icoArquivo.deleteMany({});
}
