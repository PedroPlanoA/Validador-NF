import Link from "next/link";
import { ArrowRight, BookUser, ClipboardCheck, FileKey2, FileType2, Users } from "lucide-react";
import { ehMaster } from "@/lib/auth/autorizados";
import { emailDaSessao } from "@/lib/actions/usuarios";
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
  // Logo depois do Validador de propósito: os dois tratam do mesmo cliente e se
  // referenciam um ao outro (ver a integração por CNPJ em
  // `lib/integracao/vinculoDiario.ts`), então ficam lado a lado na grade.
  {
    href: "/diario-cliente",
    nome: "Diário do Cliente",
    descricao:
      "Ficha de cada cliente com os dados do Acessórias sempre atualizados e um diário com seções, tópicos, dicas, informações importantes e alertas que só a equipe conhece.",
    entrada: "Escolher o cliente",
    icone: BookUser,
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

/** Só administradores veem. Esconder é cosmético — a rota devolve 404 para quem
 *  não é master, e as ações conferem de novo por conta própria. */
const FERRAMENTA_USUARIOS = {
  href: "/usuarios",
  nome: "Usuários",
  descricao:
    "Quem pode entrar no Hub. Libere ou remova e-mails da equipe e veja o último acesso de cada um.",
  entrada: "Gerenciar usuários",
  icone: Users,
} as const;

export default async function HubPage() {
  const email = await emailDaSessao();
  const ferramentas = ehMaster(email ?? "")
    ? [...FERRAMENTAS, FERRAMENTA_USUARIOS]
    : [...FERRAMENTAS];

  return (
    <main className="min-h-full bg-paper">
      <HubHeader titulo="Hub Fiscal" />

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <HubTitle sub="Escolha a ferramenta que você vai usar agora.">Ferramentas</HubTitle>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {ferramentas.map(({ href, nome, descricao, entrada, icone: Icone }) => (
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
