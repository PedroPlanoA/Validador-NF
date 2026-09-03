"use client";

import { useState } from "react";
import JSZip from "jszip";
import { Download, FileText, AlertTriangle, X } from "lucide-react";
import {
  decodificar,
  nomeDeSaida,
  paraAnsi,
  type SemEquivalente,
} from "@/lib/converters/ansi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TABLE_CLASS, THEAD_CLASS, TBODY_CLASS, TR_CLASS } from "@/components/ui/Table";

const ARQUIVO_ZIP = "convertidos_ANSI.zip";

interface Convertido {
  nome: string;
  tamanho: number;
  origem: "UTF-8" | "Windows-1252";
  bytes: Uint8Array;
  totalNaoMapeados: number;
  exemplos: string[];
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Tudo roda **no navegador**: os arquivos não sobem para o servidor. Vale ainda
 * mais aqui do que nos outros conversores — são arquivos fiscais prontos para
 * importação, e não há razão nenhuma para trafegarem.
 */
export function AnsiConverterForm() {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [semEquivalente, setSemEquivalente] = useState<SemEquivalente>("interrogacao");
  const [convertidos, setConvertidos] = useState<Convertido[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  function adicionar(lista: FileList | null) {
    if (!lista) return;
    const novos = Array.from(lista).filter((f) => /\.txt$/i.test(f.name));
    const ignorados = lista.length - novos.length;
    setErro(ignorados > 0 ? `${ignorados} arquivo(s) fora do formato .txt foram ignorados.` : null);
    setConvertidos(null);
    // Mesmo nome e mesmo tamanho: o arquivo já está na lista.
    setArquivos((atuais) => [
      ...atuais,
      ...novos.filter((n) => !atuais.some((a) => a.name === n.name && a.size === n.size)),
    ]);
  }

  function remover(indice: number) {
    setArquivos((a) => a.filter((_, i) => i !== indice));
    setConvertidos(null);
  }

  function limpar() {
    setArquivos([]);
    setConvertidos(null);
    setErro(null);
  }

  async function converter() {
    if (arquivos.length === 0) return;
    setProcessando(true);
    setErro(null);
    try {
      const resultado: Convertido[] = [];
      for (const arquivo of arquivos) {
        const { texto, origem } = decodificar(await arquivo.arrayBuffer());
        const { bytes, naoMapeados, totalNaoMapeados } = paraAnsi(texto, semEquivalente);
        resultado.push({
          nome: arquivo.name,
          tamanho: arquivo.size,
          origem,
          bytes,
          totalNaoMapeados,
          exemplos: [...naoMapeados.keys()].slice(0, 8),
        });
      }
      setConvertidos(resultado);
    } catch (e) {
      setErro(`Não foi possível ler os arquivos (${e instanceof Error ? e.message : String(e)}).`);
    } finally {
      setProcessando(false);
    }
  }

  async function baixarResultado() {
    if (!convertidos || convertidos.length === 0) return;

    // Um arquivo só não precisa de zip — baixa direto, e a pessoa não precisa
    // descompactar para usar.
    if (convertidos.length === 1) {
      const unico = convertidos[0];
      baixar(new Blob([unico.bytes as BlobPart], { type: "text/plain" }), nomeDeSaida(unico.nome));
      return;
    }

    const zip = new JSZip();
    for (const c of convertidos) zip.file(nomeDeSaida(c.nome), c.bytes);
    baixar(await zip.generateAsync({ type: "blob" }), ARQUIVO_ZIP);
  }

  const comPerda = convertidos?.filter((c) => c.totalNaoMapeados > 0) ?? [];
  const totalPerdido = comPerda.reduce((s, c) => s + c.totalNaoMapeados, 0);

  return (
    <div className="space-y-6">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          adicionar(e.dataTransfer.files);
        }}
        className={`block cursor-pointer rounded-card-sm border-2 border-dashed p-8 text-center transition-colors ${
          arrastando ? "border-mint bg-mint/8" : "border-ink/15 bg-white hover:border-mint"
        }`}
      >
        <input
          type="file"
          accept=".txt,text/plain"
          multiple
          className="hidden"
          onChange={(e) => {
            adicionar(e.target.files);
            e.target.value = "";
          }}
        />
        <FileText className="w-8 h-8 mx-auto text-mint-600" />
        <p className="text-sm font-semibold text-ink mt-3">
          Arraste os arquivos .txt ou clique para selecionar
        </p>
        <p className="text-xs text-ink/45 mt-1">
          Vários de uma vez · os arquivos são lidos no seu navegador e não saem do seu computador
        </p>
      </label>

      <Card className="p-5 space-y-3">
        <span className="block text-[10px] font-bold uppercase tracking-[.12em] text-ink/45">
          Caracteres sem equivalente em ANSI
        </span>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {(
            [
              { valor: "interrogacao", rotulo: 'Substituir por "?"' },
              { valor: "remover", rotulo: "Remover do arquivo" },
            ] as const
          ).map((opcao) => (
            <label key={opcao.valor} className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
              <input
                type="radio"
                name="semEquivalente"
                checked={semEquivalente === opcao.valor}
                onChange={() => {
                  setSemEquivalente(opcao.valor);
                  setConvertidos(null);
                }}
                className="w-4 h-4 accent-mint-600 cursor-pointer"
              />
              {opcao.rotulo}
            </label>
          ))}
        </div>
        <p className="text-xs text-ink/50">
          Emoji e alguns símbolos não existem em ANSI. Substituir por <strong>?</strong> preserva o tamanho das
          colunas em arquivo posicional; remover encurta a linha.
        </p>
      </Card>

      {erro && (
        <Card className="border-danger/30 bg-danger/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-ink">{erro}</p>
        </Card>
      )}

      {arquivos.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="Nenhum arquivo selecionado"
            description="Escolha um ou mais .txt acima. A conversão acontece no seu navegador e o resultado sai em ANSI (Windows-1252)."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className={TABLE_CLASS}>
              <thead className={THEAD_CLASS}>
                <tr>
                  <th className="py-3 px-5">Arquivo</th>
                  <th className="py-3 px-5 text-right whitespace-nowrap">Tamanho</th>
                  <th className="py-3 px-5 whitespace-nowrap">Lido como</th>
                  <th className="py-3 px-5">Situação</th>
                  <th className="py-3 px-5 w-10"></th>
                </tr>
              </thead>
              <tbody className={TBODY_CLASS}>
                {arquivos.map((arquivo, i) => {
                  const c = convertidos?.[i];
                  return (
                    <tr key={`${arquivo.name}-${arquivo.size}`} className={TR_CLASS}>
                      <td className="py-3 px-5 font-mono text-[11px] max-w-[280px] truncate" title={arquivo.name}>
                        {arquivo.name}
                      </td>
                      <td className="py-3 px-5 text-right tabular-nums whitespace-nowrap">
                        {formatarTamanho(arquivo.size)}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-ink/60">{c ? c.origem : "—"}</td>
                      <td className="py-3 px-5">
                        {!c ? (
                          <span className="text-ink/40">Aguardando</span>
                        ) : c.totalNaoMapeados > 0 ? (
                          <Badge tone="attention">
                            {c.totalNaoMapeados.toLocaleString("pt-BR")} caractere(s) sem equivalente
                          </Badge>
                        ) : (
                          <Badge tone="positive">Convertido</Badge>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <button
                          type="button"
                          onClick={() => remover(i)}
                          title="Remover da lista"
                          aria-label={`Remover ${arquivo.name}`}
                          className="p-1.5 rounded-input text-ink/35 hover:text-danger hover:bg-danger/10 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {convertidos && comPerda.length > 0 && (
        <Card className="border-attention/30 bg-attention/5 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-attention shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base text-ink">
                {totalPerdido.toLocaleString("pt-BR")} caractere(s) sem equivalente em ANSI
              </h3>
              <p className="text-sm text-text-2 mt-0.5">
                {semEquivalente === "interrogacao"
                  ? 'Foram trocados por "?" no arquivo convertido.'
                  : "Foram removidos do arquivo convertido."}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            {comPerda.map((c) => (
              <p key={c.nome} className="text-xs text-ink/60">
                <span className="font-mono">{c.nome}</span> — {c.totalNaoMapeados.toLocaleString("pt-BR")}{" "}
                ocorrência(s):{" "}
                <span className="font-mono text-ink">
                  {c.exemplos.map((e) => (e.trim() === "" ? "(espaço)" : e)).join("  ")}
                </span>
              </p>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={converter} disabled={arquivos.length === 0 || processando}>
          {processando ? "Convertendo..." : "Converter"}
        </Button>
        {convertidos && (
          <Button variant="solid" onClick={baixarResultado}>
            <Download className="w-4 h-4" />
            {convertidos.length === 1 ? `Baixar ${nomeDeSaida(convertidos[0].nome)}` : `Baixar ${ARQUIVO_ZIP}`}
          </Button>
        )}
        {arquivos.length > 0 && (
          <Button variant="ghost" onClick={limpar} disabled={processando}>
            Limpar lista
          </Button>
        )}
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-ink">O que é ANSI</h3>
        <p className="text-xs text-ink/55 mt-1.5 leading-relaxed">
          É como o Windows chama a página de código <strong>Windows-1252</strong>. Ela cobre os acentos do
          português, mas não emoji nem símbolos de outros alfabetos — por isso a conversão avisa o que não coube.
          Arquivo que já estiver em ANSI é lido como tal e sai intacto.
        </p>
      </Card>
    </div>
  );
}
