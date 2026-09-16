"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ExternalLink, RefreshCw, TerminalSquare, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Moldura do agente local do Emissor Nacional.
 *
 * **Por que um iframe e não a interface portada para React.** A extração precisa
 * de Chrome com interface (é ele que apresenta o certificado na negociação mTLS),
 * do repositório de certificados do Windows e de um processo vivo segurando os
 * documentos em memória. Nada disso existe na Vercel, então a ferramenta continua
 * sendo um agente local e o Hub só emoldura.
 *
 * O iframe é o que mantém **uma** interface. Se a tela fosse reescrita aqui,
 * passariam a existir duas — a do agente e a do Hub — e elas divergiriam na
 * primeira mudança feita de um lado só. Emoldurando, o documento de dentro tem
 * origem `localhost` e todas as chamadas de API ficam **mesma origem**: nenhuma
 * política de rede privada do navegador entra no caminho, que é o que derrubaria
 * uma tela que chamasse `localhost` a partir da origem pública da Vercel.
 *
 * `http://localhost` é origem potencialmente confiável, então embutir não conta
 * como conteúdo misto mesmo com o Hub em https.
 */

const ENDERECO_PADRAO = "http://localhost:3777";
const CHAVE_LOCAL = "hub:extrator-nacional:endereco";

/** Quanto esperar pelo aceno do agente antes de dizer que ele não está no ar.
 *  Generoso de propósito: a primeira carga da página do agente pode buscar
 *  fontes, e um falso "desligado" manda a pessoa reiniciar um servidor que já
 *  estava rodando. */
const ESPERA_ACENO_MS = 8000;

const ALTURA_MINIMA = 720;

type Estado = "procurando" | "ligado" | "ausente";

/** Só localhost. O endereço é digitável (a porta é configurável no agente), e
 *  sem isso um endereço qualquer viraria um site de terceiro embutido dentro do
 *  Hub, com a credibilidade da nossa moldura em volta. */
function origemLocalValida(endereco: string): string | null {
  try {
    const url = new URL(endereco);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * O endereço do agente é do navegador de quem usa — a porta é da máquina dele, e
 * o Hub é o mesmo para todo mundo. Tratado como o sistema externo que é, via
 * `useSyncExternalStore`: ler no servidor devolve o padrão e a leitura real
 * acontece na hidratação, sem `setState` dentro de efeito (que renderizaria em
 * cascata) e sem divergência entre o HTML do servidor e o do cliente.
 */
const ouvintes = new Set<() => void>();
let enderecoCache: string | null = null;
let jaLeu = false;

function lerEnderecoSalvo(): string {
  if (!jaLeu) {
    jaLeu = true;
    try {
      const salvo = localStorage.getItem(CHAVE_LOCAL);
      enderecoCache = salvo && origemLocalValida(salvo) ? salvo : null;
    } catch {
      enderecoCache = null; // Navegador sem armazenamento: o padrão serve.
    }
  }
  return enderecoCache ?? ENDERECO_PADRAO;
}

function gravarEndereco(valor: string) {
  jaLeu = true;
  enderecoCache = valor;
  try {
    localStorage.setItem(CHAVE_LOCAL, valor);
  } catch {
    // Sem armazenamento o endereço vale só para esta visita.
  }
  for (const avisar of ouvintes) avisar();
}

function inscrever(avisar: () => void) {
  ouvintes.add(avisar);
  return () => {
    ouvintes.delete(avisar);
  };
}

const enderecoNoServidor = () => ENDERECO_PADRAO;

export function ExtratorNacionalFrame() {
  const endereco = useSyncExternalStore(inscrever, lerEnderecoSalvo, enderecoNoServidor);
  /** `null` = o campo ainda acompanha o endereço em uso. Derivar na renderização
   *  evita ter de sincronizar os dois por efeito. */
  const [rascunhoEditado, setRascunhoEditado] = useState<string | null>(null);
  const rascunho = rascunhoEditado ?? endereco;
  const [estado, setEstado] = useState<Estado>("procurando");
  const [altura, setAltura] = useState(ALTURA_MINIMA);
  /** Muda a cada tentativa para remontar o iframe — trocar só o `src` para o
   *  mesmo endereço não recarrega nada. */
  const [tentativa, setTentativa] = useState(0);

  const origem = useMemo(() => origemLocalValida(endereco), [endereco]);

  const procurarDeNovo = useCallback(() => {
    setEstado("procurando");
    setTentativa((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!origem) return;

    function aoReceber(evento: MessageEvent) {
      // Sem conferir a origem, qualquer janela poderia se passar pelo agente.
      if (evento.origin !== origem) return;
      const dados = evento.data as { agente?: string; altura?: number } | null;
      if (dados?.agente !== "emissor-nacional") return;

      setEstado("ligado");
      if (typeof dados.altura === "number" && Number.isFinite(dados.altura)) {
        setAltura(Math.max(ALTURA_MINIMA, Math.ceil(dados.altura)));
      }
    }

    window.addEventListener("message", aoReceber);
    const relogio = setTimeout(
      () => setEstado((atual) => (atual === "procurando" ? "ausente" : atual)),
      ESPERA_ACENO_MS,
    );

    return () => {
      window.removeEventListener("message", aoReceber);
      clearTimeout(relogio);
    };
  }, [origem, tentativa]);

  function salvarEndereco() {
    const limpo = rascunho.trim().replace(/\/+$/, "");
    if (!origemLocalValida(limpo)) return;
    gravarEndereco(limpo);
    setRascunhoEditado(null); // Volta a acompanhar o endereço em uso.
    procurarDeNovo();
  }

  return (
    <div className="space-y-5">
      {estado !== "ligado" && (
        <PainelAgente
          estado={estado}
          endereco={endereco}
          rascunho={rascunho}
          enderecoValido={origemLocalValida(rascunho.trim().replace(/\/+$/, "")) !== null}
          onRascunho={setRascunhoEditado}
          onSalvar={salvarEndereco}
          onProcurar={procurarDeNovo}
        />
      )}

      {/* O iframe fica montado mesmo enquanto procura: é a própria carga dele
          que produz o aceno. Escondido, não desmontado — desmontar cancelaria a
          tentativa em curso.

          Sem cartão em volta: a tela de dentro já é feita de cartões, e envolvê-la
          em mais um daria cartão dentro de cartão. O fundo dela é transparente
          (ver `.embutido` no estilo do agente), então ela se apoia no papel do
          Hub e as duas partes leem como uma tela só. */}
      {origem && (
        <div className={estado === "ligado" ? "" : "absolute -left-[9999px] w-px h-px opacity-0"}>
          <iframe
            key={`${origem}#${tentativa}`}
            src={`${origem}/?moldura=hub`}
            title="Extrator do Emissor Nacional"
            className="w-full block border-0"
            style={{ height: altura }}
          />
        </div>
      )}
    </div>
  );
}

function PainelAgente({
  estado,
  endereco,
  rascunho,
  enderecoValido,
  onRascunho,
  onSalvar,
  onProcurar,
}: {
  estado: Estado;
  endereco: string;
  rascunho: string;
  enderecoValido: boolean;
  onRascunho: (v: string) => void;
  onSalvar: () => void;
  onProcurar: () => void;
}) {
  if (estado === "procurando") {
    return (
      <Card className="p-6 flex items-center gap-3">
        <RefreshCw className="w-5 h-5 text-mint-600 animate-spin shrink-0" />
        <div>
          <p className="text-sm font-bold text-ink">Procurando o agente na sua máquina…</p>
          <p className="text-sm text-text-2 mt-0.5">
            O extrator roda localmente, porque o certificado digital nunca sai do seu computador.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start gap-3">
        <TriangleAlert className="w-5 h-5 text-clay-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-ink">O agente não respondeu em {endereco}.</p>
          <p className="text-sm text-text-2 mt-1 leading-relaxed">
            Esta ferramenta não roda no servidor do Hub: ela precisa do Chrome com interface para
            você escolher o certificado, e do repositório de certificados do Windows. Por isso ela
            fica na sua máquina, e o Hub só a emoldura.
          </p>
          {/* Duas causas dão o mesmo sintoma — agente desligado, ou navegador
              recusando embutir a rede local — e daqui não dá para distinguir uma
              da outra. O link resolve as duas: abrir em aba própria é navegação
              de topo, que não passa pelas restrições de conteúdo embutido. Se
              abrir, o agente estava no ar e quem recusou foi o navegador. */}
          <p className="text-sm text-text-2 mt-3 leading-relaxed">
            Se o agente já estiver rodando, o seu navegador pode estar recusando embuti-lo. Nesse
            caso a ferramenta continua inteira em uma aba própria:
          </p>
          <a
            href={endereco}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-mint-700 hover:text-mint-800 mt-2"
          >
            Abrir o extrator em outra aba
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="rounded-card-sm bg-paper-alt/50 p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-ink/50 flex items-center gap-1.5">
          <TerminalSquare className="w-3.5 h-3.5" /> Ligue o agente e volte
        </p>
        <pre className="text-[13px] font-mono text-deep overflow-x-auto">
          cd &quot;Capturar relatório de notas&quot;{"\n"}npm start
        </pre>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="endereco-agente" className="block text-xs font-bold text-ink/60 mb-1.5">
            Endereço do agente
          </label>
          <Input
            id="endereco-agente"
            fieldSize="sm"
            value={rascunho}
            onChange={(e) => onRascunho(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enderecoValido && onSalvar()}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={onSalvar} disabled={!enderecoValido}>
          Usar este endereço
        </Button>
        <Button size="sm" onClick={onProcurar}>
          Procurar de novo
        </Button>
      </div>

      {!enderecoValido && (
        <p className="text-xs text-clay-700">
          O endereço precisa ser local (localhost ou 127.0.0.1) — o agente só escuta na sua máquina.
        </p>
      )}
    </Card>
  );
}
