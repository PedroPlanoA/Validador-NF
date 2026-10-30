import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adicionarArquivo, listarArquivos, removerArquivo, removerTodos } from "@/lib/ico/servidor";

export const runtime = "nodejs";

const texto = z.string().max(300);
const numero = z.number().finite();

const empresa = z.object({
  id: z.string().max(20),
  nome: texto,
  situacao: texto,
  regime: texto,
  honorarios: numero,
  entradas: numero,
  saidas: numero,
  servicos: numero,
  faturamento: numero,
  obrigacoes: numero,
  atendimento: numero,
  comp: z.record(z.string().max(40), numero),
  pontos: numero,
  grau: numero,
});

const base = z.object({
  tri: z.string().regex(/^(\d{4}-T[1-4]|SEM-DATA)$/),
  inicio: z.string().max(10).nullable(),
  fim: z.string().max(10).nullable(),
  empresas: z.array(empresa).min(1).max(5_000),
});

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const obrigacao = z.object({
  id: z.string().max(20),
  tarefa: texto,
  empresa: texto,
  fimmes: data,
  entrega: data.nullable(),
  status: texto,
  entregue: z.boolean(),
  noPrazo: z.boolean(),
  dispensada: z.boolean(),
  resp: texto,
  dono: texto,
});

const obrigacoes = z.object({
  linhas: z.array(obrigacao).max(100_000),
  votos: z.array(z.tuple([z.string().max(20), z.string().max(10), texto, z.number().int()])).max(100_000),
  total: z.number().int().nonnegative(),
});

const comum = { nome: z.string().min(1).max(200), tag: texto, detalhe: texto };
const novo = z.discriminatedUnion("tipo", [
  z.object({ ...comum, tipo: z.literal("base"), tri: z.string(), dados: base }),
  z.object({ ...comum, tipo: z.literal("obr"), tri: z.null(), dados: obrigacoes }),
]);

const sem = { headers: { "Cache-Control": "no-store" } };

/** GET /api/ico-fiscal — todos os arquivos guardados. */
export async function GET() {
  return NextResponse.json({ arquivos: await listarArquivos() }, sem);
}

/** POST /api/ico-fiscal — guarda um arquivo já processado no navegador. */
export async function POST(request: NextRequest) {
  const corpo = novo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Arquivo inválido." }, { status: 400 });
  const d = corpo.data;
  if (d.tipo === "base" && d.tri !== d.dados.tri) return NextResponse.json({ erro: "Trimestre inconsistente." }, { status: 400 });
  const criado = await adicionarArquivo(d);
  if (!criado) return NextResponse.json({ erro: "Já importado — remova antes de reimportar." }, { status: 409 });
  return NextResponse.json({ id: criado.id, criadoEm: criado.criadoEm }, sem);
}

/** DELETE /api/ico-fiscal?id=… remove um arquivo; ?todos=1 remove todos. */
export async function DELETE(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  if (p.get("todos") === "1") await removerTodos();
  else if (p.get("id")) await removerArquivo(p.get("id")!);
  else return NextResponse.json({ erro: "Informe id ou todos=1." }, { status: 400 });
  return NextResponse.json({ ok: true }, sem);
}
