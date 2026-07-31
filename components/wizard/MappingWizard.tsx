"use client";

import { useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { parseSpreadsheet } from "@/lib/parsing/parseSpreadsheet";
import { distinctValuesOf } from "@/lib/parsing/statusGuess";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Card } from "@/components/ui/Card";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  EMITTER_OPTIONAL_FIELDS,
  EMITTER_REQUIRED_FIELDS,
  EMITTER_STATUS_OPTIONS,
  PLATFORM_REQUIRED_FIELDS,
  PLATFORM_STATUS_OPTIONS,
} from "@/components/wizard/statusFields";
import { createPlatformConfig, updatePlatformConfig } from "@/lib/actions/platformConfigs";
import { createEmitterConfig, updateEmitterConfig } from "@/lib/actions/emitterConfigs";
import type { RawRow } from "@/lib/mapping/types";

type Kind = "platform" | "emitter";

interface ExistingConfig {
  id: string;
  name: string;
  mappings: Record<string, string>;
  cleanupChars: string;
  statusMap: Record<string, string>;
  // platform-only
  commType?: string;
  fixedCommValue?: number | null;
  currencyMode?: string;
  fixedCurrency?: string | null;
  currencyCol?: string | null;
  // emitter-only
  fallbackService?: string;
}

interface State {
  step: number;
  name: string;
  sampleHeaders: string[];
  sampleRows: RawRow[];
  fieldMappings: Record<string, string>;
  commType: "INTEGRAL" | "FIXED" | "CALC";
  fixedCommValue: string;
  currencyMode: "FIXED" | "COL" | "NONE";
  fixedCurrency: string;
  currencyCol: string;
  cleanupChars: string;
  fallbackService: string;
  statusMap: Record<string, string>;
  submitting: boolean;
  error: string | null;
}

type Action =
  | { type: "set"; patch: Partial<State> }
  | { type: "setMapping"; field: string; value: string }
  | { type: "setStatus"; raw: string; value: string }
  | { type: "renameStatus"; from: string; to: string }
  | { type: "removeStatus"; raw: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set":
      return { ...state, ...action.patch };
    case "setMapping":
      return { ...state, fieldMappings: { ...state.fieldMappings, [action.field]: action.value } };
    case "setStatus":
      return { ...state, statusMap: { ...state.statusMap, [action.raw]: action.value } };
    // Corrigir o texto de um valor digitado errado é trocar a chave, não editar
    // um valor: a chave é o texto que precisa casar com o relatório.
    case "renameStatus": {
      if (action.from === action.to) return state;
      const statusMap = { ...state.statusMap };
      const status = statusMap[action.from];
      delete statusMap[action.from];
      if (status !== undefined) statusMap[action.to] = status;
      return { ...state, statusMap };
    }
    case "removeStatus": {
      const statusMap = { ...state.statusMap };
      delete statusMap[action.raw];
      return { ...state, statusMap };
    }
    default:
      return state;
  }
}

function initialState(kind: Kind, existing?: ExistingConfig): State {
  return {
    step: 0,
    name: existing?.name ?? "",
    sampleHeaders: [],
    sampleRows: [],
    fieldMappings: existing?.mappings ?? {},
    commType: (existing?.commType as State["commType"]) ?? "INTEGRAL",
    fixedCommValue: existing?.fixedCommValue != null ? String(existing.fixedCommValue) : "100",
    currencyMode: (existing?.currencyMode as State["currencyMode"]) ?? "FIXED",
    fixedCurrency: existing?.fixedCurrency ?? "BRL",
    currencyCol: existing?.currencyCol ?? "",
    cleanupChars: existing?.cleanupChars ?? "",
    fallbackService: existing?.fallbackService ?? "",
    statusMap: existing?.statusMap ?? {},
    submitting: false,
    error: null,
  };
}

const STEP_LABELS = ["Nome", "Amostra", "Colunas", "Status", "Ajustes", "Revisar"];

export function MappingWizard({
  kind,
  existingConfig,
  basePath = "/config",
}: {
  kind: Kind;
  existingConfig?: ExistingConfig;
  /** Where the list pages live — "/config" when reached standalone (no
   *  company context), or `/c/{companyId}/config` when reached from inside
   *  a company's own shell, so saving lands back in the same shell instead
   *  of forcing a jump out to the standalone config area. */
  basePath?: string;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState(kind, existingConfig));
  const [parsing, setParsing] = useState(false);
  const [manualStatuses, setManualStatuses] = useState<string[]>([]);
  const [editingStatus, setEditingStatus] = useState<{ raw: string; text: string } | null>(null);
  const [manualStatusInput, setManualStatusInput] = useState("");

  const requiredFields = kind === "platform" ? PLATFORM_REQUIRED_FIELDS : EMITTER_REQUIRED_FIELDS;
  const optionalFields = kind === "platform" ? [] : EMITTER_OPTIONAL_FIELDS;
  const statusOptions = kind === "platform" ? PLATFORM_STATUS_OPTIONS : EMITTER_STATUS_OPTIONS;
  const statusField = kind === "platform" ? "situacaoVenda" : "situacaoNf";

  const sampleStatusValues = useMemo(() => {
    const col = state.fieldMappings[statusField];
    if (!col || state.sampleRows.length === 0) return new Set<string>();
    return new Set(distinctValuesOf(state.sampleRows, col));
  }, [state.fieldMappings, state.sampleRows, statusField]);

  const distinctStatusValues = useMemo(() => {
    // Union with already-configured keys and manually-added ones, so a
    // status set up previously (or typed in by hand) never silently
    // disappears from view just because it's absent from the current sample.
    return Array.from(new Set([...sampleStatusValues, ...Object.keys(state.statusMap), ...manualStatuses]));
  }, [sampleStatusValues, state.statusMap, manualStatuses]);

  /** Valor que veio da amostra é o texto exato do arquivo — não faz sentido
   *  renomear nem remover. Editar/excluir vale para o que foi digitado à mão (ou
   *  herdado de um mapeamento salvo sem amostra na tela), que é justamente onde
   *  cabe o erro de digitação. */
  const isEditableStatus = (raw: string) => !sampleStatusValues.has(raw);

  function removeStatus(raw: string) {
    dispatch({ type: "removeStatus", raw });
    setManualStatuses((prev) => prev.filter((v) => v !== raw));
    if (editingStatus?.raw === raw) setEditingStatus(null);
  }

  function commitStatusRename() {
    if (!editingStatus) return;
    const to = editingStatus.text.trim();
    const from = editingStatus.raw;
    if (!to || to === from) {
      setEditingStatus(null);
      return;
    }
    dispatch({ type: "renameStatus", from, to });
    setManualStatuses((prev) => {
      const withoutOld = prev.filter((v) => v !== from);
      return withoutOld.includes(to) ? withoutOld : [...withoutOld, to];
    });
    setEditingStatus(null);
  }

  async function handleFileUpload(file: File) {
    setParsing(true);
    try {
      const { headers, rows } = await parseSpreadsheet(file);
      const sampleRows = rows.slice(0, 200);
      // Intentionally NOT auto-guessing column mappings or status values here
      // — pre-filled guesses were confusing analysts into trusting a value
      // they hadn't actually checked. The sample only powers the searchable
      // column list below; every field still starts blank and must be
      // chosen deliberately.
      dispatch({ type: "set", patch: { sampleHeaders: headers, sampleRows } });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      dispatch({
        type: "set",
        patch: { error: `Não foi possível ler o arquivo (${detail}). Verifique o formato (CSV, XLS ou XLSX).` },
      });
    } finally {
      setParsing(false);
    }
  }

  function next() {
    dispatch({ type: "set", patch: { step: state.step + 1, error: null } });
  }
  function back() {
    dispatch({ type: "set", patch: { step: Math.max(0, state.step - 1), error: null } });
  }

  async function submit() {
    dispatch({ type: "set", patch: { submitting: true, error: null } });
    try {
      if (kind === "platform") {
        const input = {
          name: state.name,
          mappings: {
            codigoVenda: state.fieldMappings.codigoVenda ?? "",
            comprador: state.fieldMappings.comprador ?? "",
            produto: state.fieldMappings.produto ?? "",
            valorBase: state.fieldMappings.valorBase ?? "",
            situacaoVenda: state.fieldMappings.situacaoVenda ?? "",
            dataVenda: state.fieldMappings.dataVenda ?? "",
            valorRecebido: state.fieldMappings.valorRecebido,
            valorLiquido: state.fieldMappings.valorLiquido,
            valorFaturamentoCoprodutor: state.fieldMappings.valorFaturamentoCoprodutor,
          },
          commType: state.commType,
          fixedCommValue: state.commType === "FIXED" ? Number(state.fixedCommValue) : undefined,
          currencyMode: state.currencyMode,
          fixedCurrency: state.currencyMode === "FIXED" ? state.fixedCurrency : undefined,
          currencyCol: state.currencyMode === "COL" ? state.currencyCol : undefined,
          cleanupChars: state.cleanupChars,
          statusMap: state.statusMap as Record<string, "CONCLUIDO" | "CANCELADO" | "INCOMPLETO" | "OUTRO">,
        };
        if (existingConfig) {
          await updatePlatformConfig(existingConfig.id, input);
        } else {
          await createPlatformConfig(input);
        }
        router.push(`${basePath}/platforms`);
      } else {
        const input = {
          name: state.name,
          mappings: {
            codigoVenda: state.fieldMappings.codigoVenda ?? "",
            comprador: state.fieldMappings.comprador ?? "",
            situacaoNf: state.fieldMappings.situacaoNf ?? "",
            competencia: state.fieldMappings.competencia ?? "",
            valorNf: state.fieldMappings.valorNf ?? "",
            numero: state.fieldMappings.numero ?? "",
            tipo: state.fieldMappings.tipo ?? "",
            codigoServico: state.fieldMappings.codigoServico,
            dataEmissao: state.fieldMappings.dataEmissao,
          },
          cleanupChars: state.cleanupChars,
          fallbackService: state.fallbackService,
          statusMap: state.statusMap as Record<
            string,
            "EMITIDO" | "CANCELADO" | "ERRO_DE_EMISSAO" | "EM_EMISSAO" | "PENDENTE" | "OUTRO"
          >,
        };
        if (existingConfig) {
          await updateEmitterConfig(existingConfig.id, input);
        } else {
          await createEmitterConfig(input);
        }
        router.push(`${basePath}/emitters`);
      }
    } catch (e) {
      dispatch({
        type: "set",
        patch: { submitting: false, error: e instanceof Error ? e.message : "Erro ao salvar mapeamento." },
      });
    }
  }

  return (
    <Card className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                i === state.step
                  ? "bg-mint text-deep"
                  : i < state.step
                    ? "bg-mint-100 text-mint-700"
                    : "bg-ink/5 text-ink/40"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs font-semibold ${i === state.step ? "text-ink" : "text-ink/40"}`}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && <div className="w-6 h-px bg-ink/10" />}
          </div>
        ))}
      </div>

      {state.error && (
        <div className="mb-4 text-sm text-danger bg-danger/10 rounded-input px-4 py-2.5">
          {state.error}
        </div>
      )}

      {state.step === 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome {kind === "platform" ? "da Plataforma" : "do Emissor"}</Label>
            <Input
              value={state.name}
              onChange={(e) => dispatch({ type: "set", patch: { name: e.target.value } })}
              placeholder={kind === "platform" ? "ex: Hotmart" : "ex: Spedy"}
              autoFocus
            />
          </div>
        </div>
      )}

      {state.step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-ink/60">
            Envie um arquivo de amostra (CSV, XLS ou XLSX) para listar as colunas disponíveis na próxima etapa.
            {existingConfig && " Se preferir manter o mapeamento atual, pode pular esta etapa."}
          </p>
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="block w-full text-sm border-2 border-dashed border-ink/15 rounded-input p-4 cursor-pointer hover:border-mint transition-colors"
          />
          {parsing && <p className="text-xs text-ink/50">Lendo arquivo...</p>}
          {state.sampleHeaders.length > 0 && (
            <p className="text-xs text-positive">
              {state.sampleHeaders.length} colunas detectadas, {state.sampleRows.length} linhas de amostra.
            </p>
          )}
        </div>
      )}

      {state.step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-ink/50">
            Digite para pesquisar o nome exato da coluna no arquivo. Nenhum campo vem preenchido automaticamente —
            confira e escolha cada um manualmente.
          </p>
          {[...requiredFields, ...optionalFields].map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Combobox
                value={state.fieldMappings[f.key] ?? ""}
                onChange={(value) => dispatch({ type: "setMapping", field: f.key, value })}
                options={state.sampleHeaders}
                placeholder="nome exato da coluna no arquivo"
              />
              {f.hint && <p className="text-[11px] text-ink/45">{f.hint}</p>}
            </div>
          ))}

          {kind === "platform" && (
            <>
              <div className="pt-2 border-t border-ink/5 space-y-1.5">
                <Label>Tipo de Comissão</Label>
                <Select
                  value={state.commType}
                  onChange={(e) => dispatch({ type: "set", patch: { commType: e.target.value as State["commType"] } })}
                >
                  <option value="INTEGRAL">Integral (100% do valor da venda)</option>
                  <option value="FIXED">Percentual fixo</option>
                  <option value="CALC">Calculado (recebido / faturamento)</option>
                </Select>
              </div>
              {state.commType === "FIXED" && (
                <div className="space-y-1.5">
                  <Label>Percentual fixo (%)</Label>
                  <Input
                    type="number"
                    value={state.fixedCommValue}
                    onChange={(e) => dispatch({ type: "set", patch: { fixedCommValue: e.target.value } })}
                  />
                </div>
              )}
              {state.commType === "CALC" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Coluna Valor Recebido</Label>
                      <Combobox
                        value={state.fieldMappings.valorRecebido ?? ""}
                        onChange={(value) => dispatch({ type: "setMapping", field: "valorRecebido", value })}
                        options={state.sampleHeaders}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Coluna Faturamento do Produtor</Label>
                      <Combobox
                        value={state.fieldMappings.valorLiquido ?? ""}
                        onChange={(value) => dispatch({ type: "setMapping", field: "valorLiquido", value })}
                        options={state.sampleHeaders}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Coluna Faturamento do Coprodutor (opcional)</Label>
                    <Combobox
                      value={state.fieldMappings.valorFaturamentoCoprodutor ?? ""}
                      onChange={(value) => dispatch({ type: "setMapping", field: "valorFaturamentoCoprodutor", value })}
                      options={state.sampleHeaders}
                    />
                    <p className="text-[11px] text-ink/40">
                      % de comissão = Valor Recebido / (Faturamento do Produtor + Faturamento do Coprodutor). Deixe em
                      branco se a venda não tiver coprodução.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-ink/5 space-y-1.5">
                <Label>Moeda</Label>
                <Select
                  value={state.currencyMode}
                  onChange={(e) => dispatch({ type: "set", patch: { currencyMode: e.target.value as State["currencyMode"] } })}
                >
                  <option value="FIXED">Fixa</option>
                  <option value="COL">Coluna do arquivo</option>
                  <option value="NONE">Nenhuma (usar BRL)</option>
                </Select>
              </div>
              {state.currencyMode === "FIXED" && (
                <div className="space-y-1.5">
                  <Label>Código da Moeda</Label>
                  <Input
                    value={state.fixedCurrency}
                    onChange={(e) => dispatch({ type: "set", patch: { fixedCurrency: e.target.value.toUpperCase() } })}
                    placeholder="BRL"
                  />
                </div>
              )}
              {state.currencyMode === "COL" && (
                <div className="space-y-1.5">
                  <Label>Coluna de Moeda</Label>
                  <Combobox
                    value={state.currencyCol}
                    onChange={(value) => dispatch({ type: "set", patch: { currencyCol: value } })}
                    options={state.sampleHeaders}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {state.step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-ink/60">
            Confira como cada valor encontrado na amostra deve ser interpretado. Nada vem pré-selecionado — escolha o
            status correto para cada valor.
          </p>
          {distinctStatusValues.length === 0 && (
            <p className="text-xs text-ink/40 italic">
              Nenhum valor distinto encontrado ainda — envie uma amostra na etapa anterior ou selecione a coluna de
              status.
            </p>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <Input
              value={manualStatusInput}
              onChange={(e) => setManualStatusInput(e.target.value)}
              placeholder="Digite um valor que não apareceu automaticamente"
              className="min-w-0"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const value = manualStatusInput.trim();
                if (!value) return;
                setManualStatuses((prev) => (prev.includes(value) ? prev : [...prev, value]));
                setManualStatusInput("");
              }}
            />
            <Button
              type="button"
              variant="ghost"
              className="shrink-0 px-4"
              onClick={() => {
                const value = manualStatusInput.trim();
                if (!value) return;
                setManualStatuses((prev) => (prev.includes(value) ? prev : [...prev, value]));
                setManualStatusInput("");
              }}
            >
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto overflow-x-hidden">
            {distinctStatusValues.map((raw) => (
              <div
                key={raw}
                className="flex items-center justify-between gap-3 bg-paper-alt/40 rounded-input px-3 py-2.5"
              >
                {editingStatus?.raw === raw ? (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Input
                      autoFocus
                      fieldSize="sm"
                      value={editingStatus.text}
                      onChange={(e) => setEditingStatus({ raw, text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitStatusRename();
                        } else if (e.key === "Escape") {
                          setEditingStatus(null);
                        }
                      }}
                      className="min-w-0"
                    />
                    <button
                      type="button"
                      onClick={commitStatusRename}
                      title="Salvar texto"
                      className="shrink-0 p-1.5 rounded-input text-mint-700 hover:bg-mint/10 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStatus(null)}
                      title="Cancelar"
                      className="shrink-0 p-1.5 rounded-input text-ink/40 hover:text-ink transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-ink break-words leading-snug min-w-0 flex-1" title={raw}>
                    {raw}
                  </span>
                )}

                {editingStatus?.raw !== raw && isEditableStatus(raw) && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingStatus({ raw, text: raw })}
                      title="Corrigir o texto deste valor"
                      className="p-1.5 rounded-input text-ink/35 hover:text-teal hover:bg-teal/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStatus(raw)}
                      title="Remover este valor do mapeamento"
                      className="p-1.5 rounded-input text-ink/35 hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {/* A largura fixa vive neste invólucro, não no `className` do
                    Select: o componente já traz `w-full`, e qual das duas
                    classes de largura vence depende da ordem do CSS gerado —
                    era isso que fazia o select ocupar a linha inteira e
                    esmagar o valor em uma letra por linha. */}
                <div className="w-44 shrink-0">
                  <Select
                    value={state.statusMap[raw] ?? ""}
                    onChange={(e) => dispatch({ type: "setStatus", raw, value: e.target.value })}
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.step === 4 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Caracteres a remover do código da venda</Label>
            <Input
              value={state.cleanupChars}
              onChange={(e) => dispatch({ type: "set", patch: { cleanupChars: e.target.value } })}
              placeholder="ex: / _ @ (separados por espaço)"
            />
          </div>
          {kind === "emitter" && (
            <div className="space-y-1.5">
              <Label>Código de serviço padrão (se a coluna estiver vazia)</Label>
              <Input
                value={state.fallbackService}
                onChange={(e) => dispatch({ type: "set", patch: { fallbackService: e.target.value } })}
                placeholder="ex: 0107"
              />
            </div>
          )}
        </div>
      )}

      {state.step === 5 && (
        <div className="space-y-3 text-sm">
          <p>
            <strong>Nome:</strong> {state.name}
          </p>
          <p>
            <strong>Colunas mapeadas:</strong> {Object.keys(state.fieldMappings).length}
          </p>
          <p>
            <strong>Valores de status configurados:</strong> {Object.keys(state.statusMap).length}
          </p>
          <p className="text-ink/50">Revise as etapas anteriores se algo estiver incorreto, ou salve o mapeamento.</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-6 mt-6 border-t border-ink/5">
        <Button variant="ghost" onClick={back} disabled={state.step === 0}>
          Voltar
        </Button>
        {state.step < STEP_LABELS.length - 1 ? (
          <Button onClick={next} disabled={state.step === 0 && !state.name.trim()}>
            Próximo
          </Button>
        ) : (
          <Button onClick={submit} disabled={state.submitting}>
            {state.submitting ? "Salvando..." : "Salvar Mapeamento"}
          </Button>
        )}
      </div>
    </Card>
  );
}
