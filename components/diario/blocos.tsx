import {
  AlertTriangle,
  Heading1,
  Heading2,
  Heading3,
  Info,
  Lightbulb,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { Bloco, TipoBloco } from "@/lib/diario/armazenamento";

/**
 * Os tipos de item do diário. A cor de cada destaque segue a semântica do
 * design system do Validador: menta = positivo (dica), teal = informativo
 * (importante), clay = atenção (alerta). O vermelho `danger` fica reservado a
 * erro/exclusão, como no restante do sistema.
 */
export const TIPOS: Record<
  TipoBloco,
  { rotulo: string; icone: LucideIcon; placeholder: string; titulo: boolean; destaque?: string; texto?: string }
> = {
  secao: { rotulo: "Seção", icone: Heading1, placeholder: "Nome da seção (ex.: Fiscal)", titulo: true },
  topico: { rotulo: "Tópico", icone: Heading2, placeholder: "Tópico (ex.: Apuração do ICMS)", titulo: true },
  subtopico: { rotulo: "Subtópico", icone: Heading3, placeholder: "Subtópico", titulo: true },
  anotacao: { rotulo: "Anotação", icone: StickyNote, placeholder: "Escreva a anotação…", titulo: false },
  dica: {
    rotulo: "Dica",
    icone: Lightbulb,
    placeholder: "Uma dica para quem for atender este cliente…",
    titulo: false,
    destaque: "bg-mint/10 border-mint",
    texto: "text-mint-700",
  },
  importante: {
    rotulo: "Importante",
    icone: Info,
    placeholder: "Informação importante sobre o cliente…",
    titulo: false,
    destaque: "bg-teal/8 border-teal",
    texto: "text-teal",
  },
  alerta: {
    rotulo: "Alerta",
    icone: AlertTriangle,
    placeholder: "O que ninguém pode esquecer…",
    titulo: false,
    destaque: "bg-clay/12 border-clay",
    texto: "text-clay-700",
  },
};

/**
 * Recuo de cada item conforme o título sob o qual ele está: conteúdo de um
 * tópico fica um nível para dentro, de um subtópico dois. O recuo é derivado da
 * ordem dos itens, não guardado, então mover um item já o reposiciona.
 */
export function niveis(blocos: Bloco[]): number[] {
  let base = 0;
  return blocos.map((b) => {
    switch (b.tipo) {
      case "secao":
        base = 0;
        return 0;
      case "topico":
        base = 1;
        return 0;
      case "subtopico":
        base = 2;
        return 1;
      default:
        return base;
    }
  });
}

/** Item em modo leitura. */
export function BlocoLeitura({ bloco }: { bloco: Bloco }) {
  const t = TIPOS[bloco.tipo];
  const texto = bloco.texto.trim();

  if (bloco.tipo === "topico") {
    return (
      <h4 className="flex items-center gap-2.5 font-sans font-bold text-base text-ink pt-2">
        <span className="w-1 h-4 rounded-full bg-mint shrink-0" />
        {texto || <span className="text-ink/30 italic font-normal">Tópico sem título</span>}
      </h4>
    );
  }
  if (bloco.tipo === "subtopico") {
    return (
      <h5 className="text-sm font-bold text-teal pt-1">
        {texto || <span className="text-ink/30 italic font-normal">Subtópico sem título</span>}
      </h5>
    );
  }
  if (bloco.tipo === "anotacao") {
    return <p className="text-sm text-text-2 whitespace-pre-wrap leading-relaxed">{texto}</p>;
  }

  const Icone = t.icone;
  return (
    <div className={`flex gap-3 border-l-4 rounded-r-input px-4 py-3 ${t.destaque}`}>
      <Icone className={`w-4 h-4 mt-0.5 shrink-0 ${t.texto}`} />
      <div className="min-w-0">
        <span className={`block text-[10px] font-bold uppercase tracking-[.14em] ${t.texto}`}>{t.rotulo}</span>
        <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed mt-0.5">{texto}</p>
      </div>
    </div>
  );
}
