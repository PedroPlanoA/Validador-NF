export const PLATFORM_STATUS_OPTIONS = [
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "INCOMPLETO", label: "Incompleto" },
  { value: "OUTRO", label: "Outro" },
];

export const EMITTER_STATUS_OPTIONS = [
  { value: "EMITIDO", label: "Emitido" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "ERRO_DE_EMISSAO", label: "Erro de Emissão" },
  { value: "EM_EMISSAO", label: "Em Emissão" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "OUTRO", label: "Outro" },
];

/** Campo de mapeamento exibido na etapa de colunas do assistente. */
export interface MappingField {
  key: string;
  label: string;
  /** Explicação curta sob o campo, quando o nome não basta. */
  hint?: string;
}

export const PLATFORM_REQUIRED_FIELDS: MappingField[] = [
  { key: "codigoVenda", label: "Código da Venda" },
  { key: "comprador", label: "Comprador" },
  { key: "produto", label: "Produto" },
  { key: "valorBase", label: "Valor da Venda" },
  { key: "situacaoVenda", label: "Situação da Venda" },
  { key: "dataVenda", label: "Data da Venda" },
];

export const EMITTER_REQUIRED_FIELDS: MappingField[] = [
  { key: "codigoVenda", label: "Código da Venda" },
  { key: "comprador", label: "Comprador" },
  { key: "situacaoNf", label: "Situação da Nota" },
  {
    key: "competencia",
    label: "Competência",
    hint: "Coluna de competência do relatório. É o que vale para toda nota, exceto devolução — ver o campo de data de emissão abaixo.",
  },
  { key: "valorNf", label: "Valor da Nota" },
  { key: "numero", label: "Número da Nota" },
  { key: "tipo", label: "Tipo (NF-e / NFS-e)" },
];

export const EMITTER_OPTIONAL_FIELDS: MappingField[] = [
  { key: "codigoServico", label: "Código de Serviço (opcional)" },
  {
    key: "dataEmissao",
    label: "Data de Emissão / Autorização (opcional)",
    hint: "Necessária para nota de devolução: o relatório traz a devolução com a competência da venda original, e é esta data que define a competência correta dela.",
  },
];
