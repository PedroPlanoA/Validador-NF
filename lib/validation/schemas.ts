import { z } from "zod";

export const companySchema = z.object({
  codigo: z.string().trim().min(1, "Código é obrigatório"),
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  cnpj: z.string().trim().min(1, "CNPJ é obrigatório"),
});

export type CompanyInput = z.infer<typeof companySchema>;

const platformMappingsSchema = z.object({
  codigoVenda: z.string().min(1),
  comprador: z.string().min(1),
  produto: z.string().min(1),
  valorBase: z.string().min(1),
  situacaoVenda: z.string().min(1),
  dataVenda: z.string().min(1),
  valorRecebido: z.string().optional(),
  valorLiquido: z.string().optional(),
});

export const platformConfigSchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório"),
    mappings: platformMappingsSchema,
    commType: z.enum(["INTEGRAL", "FIXED", "CALC"]),
    fixedCommValue: z.number().min(0).max(1000).optional(),
    currencyMode: z.enum(["FIXED", "COL", "NONE"]),
    fixedCurrency: z.string().optional(),
    currencyCol: z.string().optional(),
    cleanupChars: z.string().default(""),
    statusMap: z.record(z.string(), z.enum(["CONCLUIDO", "CANCELADO", "INCOMPLETO", "OUTRO"])),
  })
  .refine((v) => v.commType !== "FIXED" || v.fixedCommValue !== undefined, {
    message: "Informe o percentual fixo de comissão",
    path: ["fixedCommValue"],
  })
  .refine((v) => v.commType !== "CALC" || (!!v.mappings.valorRecebido && !!v.mappings.valorLiquido), {
    message: "Informe as colunas de valor recebido e valor líquido",
    path: ["mappings"],
  })
  .refine((v) => v.currencyMode !== "FIXED" || !!v.fixedCurrency, {
    message: "Informe a moeda fixa",
    path: ["fixedCurrency"],
  })
  .refine((v) => v.currencyMode !== "COL" || !!v.currencyCol, {
    message: "Informe a coluna de moeda",
    path: ["currencyCol"],
  });

export type PlatformConfigFormInput = z.infer<typeof platformConfigSchema>;

const emitterMappingsSchema = z.object({
  codigoVenda: z.string().min(1),
  comprador: z.string().min(1),
  situacaoNf: z.string().min(1),
  competencia: z.string().min(1),
  valorNf: z.string().min(1),
  numero: z.string().min(1),
  tipo: z.string().min(1),
  codigoServico: z.string().optional(),
});

export const emitterConfigSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  mappings: emitterMappingsSchema,
  cleanupChars: z.string().default(""),
  fallbackService: z.string().default(""),
  statusMap: z.record(
    z.string(),
    z.enum(["EMITIDO", "CANCELADO", "ERRO_DE_EMISSAO", "EM_EMISSAO", "OUTRO"]),
  ),
});

export type EmitterConfigFormInput = z.infer<typeof emitterConfigSchema>;

export const importRequestSchema = z.object({
  sourceType: z.enum(["PLATFORM", "EMITTER"]),
  configId: z.string().min(1),
  filename: z.string().min(1),
  rawRows: z.array(z.record(z.string(), z.string())).min(1, "Arquivo vazio"),
});

export type ImportRequestInput = z.infer<typeof importRequestSchema>;

export const checklistStateSchema = z.object({
  competencia: z.string().min(1),
  itemsJson: z.record(z.string(), z.boolean()),
});
