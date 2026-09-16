import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileCode2, FileKey2, FileType2 } from "lucide-react";
import { HubHeader, HubTitle } from "@/components/layout/HubHeader";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

/** As ferramentas do Hub. Acrescentar uma é acrescentar um item aqui. */
const FERRAMENTAS = [
  {
    href: "/companies",
    nome: "Validador de Emissões",
    descricao:
      "Cruza o relatório de vendas da plataforma com o relatório de notas do emissor e aponta venda sem nota, erro de emissão, cancelamento inconsistente e divergência de valor.",
    entrada: "Escolher a empresa",
    icone: ClipboardCheck,
  },
  {
    href: "/conversor-dominio",
    nome: "Conversor de Leiaute",
    descricao:
      "Converte a planilha de NFS-e do emissor nacional no arquivo TXT de importação do Domínio, nos modelos de entrada (serviços tomados) e de serviço (prestados).",
    entrada: "Abrir o conversor",
    icone: FileCode2,
  },
  {
    href: "/conversor-ansi",
    nome: "Conversor ANSI",
    descricao:
      "Converte arquivos .txt para a codificação ANSI (Windows-1252), vários de uma vez, avisando quais caracteres não têm equivalente antes de você importar.",
    entrada: "Abrir o conversor",
    icone: FileType2,
  },
  {
    href: "/extrator-nacional",
    nome: "Extrair notas do Emissor Nacional",
    descricao:
      "Lê as notas emitidas e tomadas direto da API oficial do ADN, com o certificado digital da empresa, e exporta em Excel ou XML. Roda na sua máquina — o certificado nunca sai dela.",
    entrada: "Abrir o extrator",
    icone: FileKey2,
  },
] as const;

export default function HubPage() {
  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Hub Fiscal" />

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <HubTitle sub="Escolha a ferramenta que você vai usar agora.">Ferramentas</HubTitle>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {FERRAMENTAS.map(({ href, nome, descricao, entrada, icone: Icone }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full p-6 flex flex-col gap-4 transition-shadow group-hover:shadow-card-hover">
                <div className="w-12 h-12 rounded-card-sm bg-mint/12 flex items-center justify-center shrink-0">
                  <Icone className="w-6 h-6 text-mint-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif font-black text-xl text-deep">{nome}</h3>
                  <p className="text-sm text-text-2 mt-2 leading-relaxed">{descricao}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-mint-700">
                  {entrada}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
