import { z } from "zod";

// Regex estrita (UUID v4), igual ao middleware original de professor.
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ProfessorListagemQuerySchema = z.object({
  EscolaGUID: z
    .string({ message: "EscolaGUID é obrigatório na query string" })
    .regex(GUID_REGEX, "EscolaGUID deve ser um UUID válido"),
});

export const ProfessorAlocacoesParamsSchema = z.object({
  cpf: z
    .string({ message: "CPF do professor é obrigatório" })
    .refine((v) => v.replace(/\D/g, "").length === 11, "CPF deve ter 11 dígitos"),
  escolaGUID: z
    .string({ message: "EscolaGUID é obrigatório" })
    .regex(GUID_REGEX, "EscolaGUID deve ser um UUID válido"),
});

const ALOCACAO_STATUS_ENUM = ["Ativa", "Inativa"] as const;
const ALOCACAO_STATUS_MSG = 'AlocacaoStatus deve ser "Ativa" ou "Inativa"';

const aulasPorSemanaCampo = () =>
  z
    .unknown()
    .refine(
      (v) => v === undefined || v === null || (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 20),
      "AulasPorSemana deve ser um número inteiro entre 1 e 20"
    )
    .optional();

export const CriarAlocacaoBodySchema = z.object({
  alocacao: z.object(
    {
      MateriaGUID: z
        .string({ message: "MateriaGUID é obrigatório" })
        .regex(GUID_REGEX, "MateriaGUID deve ser um UUID válido"),
      TurmaGUID: z
        .string({ message: "TurmaGUID é obrigatório" })
        .regex(GUID_REGEX, "TurmaGUID deve ser um UUID válido"),
      UsuarioCPF: z
        .string({ message: "UsuarioCPF é obrigatório" })
        .refine((v) => v.replace(/\D/g, "").length === 11, "UsuarioCPF deve ter 11 dígitos"),
      AlocacaoStatus: z.enum(ALOCACAO_STATUS_ENUM, { message: ALOCACAO_STATUS_MSG }).optional(),
      AulasPorSemana: aulasPorSemanaCampo(),
    },
    { message: 'Campo "alocacao" é obrigatório e deve ser um objeto' }
  ),
});

export const AtualizarAlocacaoBodySchema = z.object({
  alocacao: z
    .object(
      {
        AlocacaoStatus: z.enum(ALOCACAO_STATUS_ENUM, { message: ALOCACAO_STATUS_MSG }).optional(),
        AulasPorSemana: aulasPorSemanaCampo(),
      },
      { message: 'Campo "alocacao" é obrigatório e deve ser um objeto' }
    )
    .refine(
      (v) => v.AlocacaoStatus !== undefined || v.AulasPorSemana !== undefined,
      "É necessário fornecer ao menos um campo para atualização"
    ),
});

export const AlocacaoGUIDParamSchema = z.object({
  guid: z
    .string({ message: "GUID da alocação é obrigatório" })
    .regex(GUID_REGEX, "GUID da alocação deve ser um UUID válido"),
});
