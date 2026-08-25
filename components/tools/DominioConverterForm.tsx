"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  COLUNAS_ESPERADAS,
  DATA_PADRAO,
  converterParaDominio,
  type ConversaoConfig,
  type LinhaPlanilha,
  type ResultadoConversao,
} from "@/lib/converters/dominioNfse";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/validation/currency";

const ARQUIVO_SAIDA = "IMPORTACAO_DOMINIO_NFSE.TXT";

const CONFIG_INICIAL: ConversaoConfig = {
  acumulador: "2",
  ufTomador: "SP",
  seriePadrao: "900",
  especiePadrao: "39",
};

/**
 * A conversão roda **inteira no navegador**: a planilha nunca sobe para o
 * servidor. Não é só economia — é o dado do cliente não trafegar sem
 * necessidade, e era também a promessa da ferramenta original.
 */
export function DominioConverterForm() {
  const [config, setConfig] = useState<ConversaoConfig>(CONFIG_INICIAL);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoConversao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const setCampo = (campo: keyof ConversaoConfig) => (valor: string) =>
    setConfig((c) => ({ ...c, [campo]: valor }));

  function selecionar(file: File | null) {
    setArquivo(file);
    setResultado(null);
    setErro(null);
  }

  async function converter() {
    if (!arquivo) return;
    setProcessando(true);
    setErro(null);
    try {
      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
      const planilha = workbook.Sheets[workbook.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json<LinhaPlanilha>(planilha, { defval: "" });

      if (linhas.length === 0) {
        setErro("A planilha está vazia.");
        return;
      }

      const r = converterParaDominio(linhas, config);
      if (r.notas === 0) {
        setErro(
          r.colunasFaltando.length > 0
            ? `Nenhuma nota foi convertida. A planilha não tem a(s) coluna(s): ${r.colunasFaltando.join(", ")}.`
            : "Nenhuma nota válida na planilha — todas as linhas estão sem número de NFS-e ou sem CNPJ do prestador.",
        );
        return;
      }
      setResultado(r);
    } catch (e) {
      setErro(
        `Não foi possível ler a planilha (${e instanceof Error ? e.message : String(e)}). Confirme que é um .xlsx ou .xls válido.`,
      );
    } finally {
      setProcessando(false);
    }
  }

  function baixar() {
    if (!resultado) return;
    const blob = new Blob([resultado.conteudo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ARQUIVO_SAIDA;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Acumulador</Label>
            <Input
              value={config.acumulador}
              onChange={(e) => setCampo("acumulador")(e.target.value)}
              placeholder="ex: 2"
            />
          </div>
          <div className="space-y-1.5">
            <Label>UF do tomador</Label>
            <Input
              value={config.ufTomador}
              onChange={(e) => setCampo("ufTomador")(e.target.value.toUpperCase())}
              maxLength={2}
              className="uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Série</Label>
            <Input value={config.seriePadrao} onChange={(e) => setCampo("seriePadrao")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Espécie</Label>
            <Input value={config.especiePadrao} onChange={(e) => setCampo("especiePadrao")(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-ink/50">
          A UF do tomador define o CFOP de cada nota: <strong>1933</strong> quando o prestador é do mesmo estado
          (ou a UF dele não vem na planilha) e <strong>2933</strong> quando é de fora.
        </p>
      </Card>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          selecionar(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`block cursor-pointer rounded-card-sm border-2 border-dashed p-8 text-center transition-colors ${
          arrastando ? "border-mint bg-mint/8" : "border-ink/15 bg-white hover:border-mint"
        }`}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => selecionar(e.target.files?.[0] ?? null)}
        />
        <FileSpreadsheet className="w-8 h-8 mx-auto text-mint-600" />
        <p className="text-sm font-semibold text-ink mt-3">
          {arquivo ? arquivo.name : "Arraste a planilha do emissor nacional ou clique para selecionar"}
        </p>
        <p className="text-xs text-ink/45 mt-1">
          .xlsx ou .xls · a planilha é lida no seu navegador e não sai do seu computador
        </p>
      </label>

      {erro && (
        <Card className="border-danger/30 bg-danger/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-ink">{erro}</p>
        </Card>
      )}

      {resultado && (
        <Card className="border-positive/30 bg-positive/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-mint-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base text-ink">Conversão pronta</h3>
              <p className="text-sm text-text-2 mt-0.5">
                Confira os números antes de importar no Domínio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { rotulo: "Notas", valor: resultado.notas.toLocaleString("pt-BR") },
              { rotulo: "Prestadores", valor: resultado.prestadores.toLocaleString("pt-BR") },
              { rotulo: "Valor total", valor: formatCurrency(resultado.valorTotal, "BRL") },
              {
                rotulo: "CFOP 1933 / 2933",
                valor: `${resultado.cfopDentroDoEstado.toLocaleString("pt-BR")} / ${resultado.cfopForaDoEstado.toLocaleString("pt-BR")}`,
              },
            ].map((k) => (
              <div key={k.rotulo}>
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-ink/45 block">
                  {k.rotulo}
                </span>
                <span className="text-lg font-serif font-black text-deep">{k.valor}</span>
              </div>
            ))}
          </div>

          {(resultado.ignoradas > 0 || resultado.semCompetencia > 0) && (
            <div className="space-y-1.5 pt-1">
              {resultado.ignoradas > 0 && (
                <p className="text-xs text-attention">
                  {resultado.ignoradas.toLocaleString("pt-BR")} linha(s) ignorada(s) por não ter número de NFS-e ou
                  CNPJ do prestador.
                </p>
              )}
              {resultado.semCompetencia > 0 && (
                <p className="text-xs text-attention">
                  {resultado.semCompetencia.toLocaleString("pt-BR")} nota(s) sem competência legível receberam a data
                  padrão <strong>{DATA_PADRAO}</strong> — confira essas antes de importar.
                </p>
              )}
            </div>
          )}

          <Button variant="solid" onClick={baixar}>
            <Download className="w-4 h-4" /> Baixar {ARQUIVO_SAIDA}
          </Button>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={converter} disabled={!arquivo || processando}>
          {processando ? "Convertendo..." : "Converter"}
        </Button>
        {!arquivo && <span className="text-xs text-ink/45">Selecione a planilha para habilitar.</span>}
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-ink">Colunas que a planilha precisa ter</h3>
        <p className="text-xs text-ink/50 mt-1">
          Os nomes precisam ser exatamente estes — é como o emissor nacional exporta.
        </p>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
          {COLUNAS_ESPERADAS.map((c) => (
            <li key={c} className="text-xs text-ink/70 font-mono">
              {c}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
