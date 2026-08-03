import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CriarAnotacaoBodySchema = z.object({
  EscolaGUID: z.string({ message: "EscolaGUID é obrigatório" }).min(1, "EscolaGUID é obrigatório"),
  AnotacaoData: z
    .string({ message: "AnotacaoData é obrigatória" })
    .min(1, "AnotacaoData é obrigatória")
    .refine((v) => !isNaN(new Date(v).getTime()), "AnotacaoData inválida (use formato ISO 8601)"),
  AnotacaoTitulo: z
    .string({ message: "AnotacaoTitulo é obrigatório" })
    .min(1, "AnotacaoTitulo é obrigatório")
    .refine((v) => v.trim().length > 0, "AnotacaoTitulo não pode ser vazio")
    .refine((v) => v.length <= 256, "AnotacaoTitulo não pode exceder 256 caracteres"),
  AnotacaoDescricao: z
    .string({ message: "AnotacaoDescricao deve ser uma string" })
    .max(2048, "AnotacaoDescricao não pode exceder 2048 caracteres")
    .optional(),
});

export const AtualizarAnotacaoBodySchema = z
  .object({
    AnotacaoData: z
      .string()
      .refine((v) => !isNaN(new Date(v).getTime()), "AnotacaoData inválida")
      .optional(),
    AnotacaoTitulo: z
      .string({ message: "AnotacaoTitulo não pode ser vazio" })
      .refine((v) => v.trim().length > 0, "AnotacaoTitulo não pode ser vazio")
      .refine((v) => v.length <= 256, "AnotacaoTitulo não pode exceder 256 caracteres")
      .optional(),
    AnotacaoDescricao: z
      .string({ message: "AnotacaoDescricao deve ser string ou null" })
      .max(2048, "AnotacaoDescricao não pode exceder 2048 caracteres")
      .nullable()
      .optional(),
    AnotacaoIsFeito: z.boolean({ message: "AnotacaoIsFeito deve ser boolean" }).optional(),
  })
  .refine(
    (v) => v.AnotacaoData !== undefined || v.AnotacaoTitulo !== undefined || v.AnotacaoDescricao !== undefined || v.AnotacaoIsFeito !== undefined,
    "Nenhum campo para atualizar foi fornecido"
  );

export const AnotacaoGUIDParamSchema = z.object({
  guid: z
    .string({ message: "AnotacaoGUID é obrigatório nos parâmetros" })
    .regex(GUID_REGEX, "AnotacaoGUID inválido (deve ser UUID v4)"),
});

const booleanTexto = (mensagem: string) => z.string().refine((v) => ["true", "false", "1", "0"].includes(v), mensagem);

export const AnotacaoFiltrosQuerySchema = z.object({
  EscolaGUID: z.string({ message: "EscolaGUID é obrigatório nos parâmetros de busca" }).min(1, "EscolaGUID é obrigatório nos parâmetros de busca"),
  DataInicio: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), "DataInicio inválida")
    .optional(),
  DataFim: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), "DataFim inválida")
    .optional(),
  AnotacaoIsFeito: booleanTexto("AnotacaoIsFeito deve ser true, false, 1 ou 0").optional(),
});
