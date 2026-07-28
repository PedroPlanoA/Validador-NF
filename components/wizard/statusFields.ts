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
  { value: "OUTRO", label: "Outro" },
];

export const PLATFORM_REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "codigoVenda", label: "Código da Venda" },
  { key: "comprador", label: "Comprador" },
  { key: "produto", label: "Produto" },
  { key: "valorBase", label: "Valor da Venda" },
  { key: "situacaoVenda", label: "Situação da Venda" },
  { key: "dataVenda", label: "Data da Venda" },
];

export const EMITTER_REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "codigoVenda", label: "Código da Venda" },
  { key: "comprador", label: "Comprador" },
  { key: "situacaoNf", label: "Situação da Nota" },
  { key: "competencia", label: "Competência / Data de Emissão" },
  { key: "valorNf", label: "Valor da Nota" },
  { key: "numero", label: "Número da Nota" },
  { key: "tipo", label: "Tipo (NF-e / NFS-e)" },
];

export const EMITTER_OPTIONAL_FIELDS: { key: string; label: string }[] = [
  { key: "codigoServico", label: "Código de Serviço (opcional)" },
];
