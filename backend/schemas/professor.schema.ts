import { z } from "zod";

// Regex estrita (UUID v4), igual ao middleware original de professor.
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// usuario.UsuarioGUID é CHAR(12) (base64url), diferente do UUID v4 padrão
// (ver backend/utils/helpers/guid.helper.ts).
const USUARIO_GUID_REGEX = /^[A-Za-z0-9_-]{12}$/;

export const ProfessorListagemQuerySchema = z.object({
  EscolaGUID: z
    .string({ message: "Escola inválida" })
    .regex(GUID_REGEX, "Escola inválida"),
});

export const ProfessorAlocacoesParamsSchema = z.object({
  usuarioGUID: z
    .string({ message: "Informe o professor" })
    .regex(USUARIO_GUID_REGEX, "Identificador do professor inválido"),
  escolaGUID: z
    .string({ message: "Escola inválida" })
    .regex(GUID_REGEX, "Escola inválida"),
});

const ALOCACAO_STATUS_ENUM = ["Ativa", "Inativa"] as const;
const ALOCACAO_STATUS_MSG = 'O status deve ser "Ativa" ou "Inativa"';

const aulasPorSemanaCampo = () =>
  z
    .unknown()
    .refine(
      (v) => v === undefined || v === null || (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 20),
      "O número de aulas por semana deve ser um inteiro entre 1 e 20"
    )
    .optional();

/**
 * `POST /api/professor/alocacao` aceita tanto o corpo individual
 * (`{alocacao: {...}}`, GUIDs obrigatórios) quanto o em massa
 * (`{alocacoes: [...], EscolaGUID}`, aceita MateriaNome/TurmaNome —
 * `ProfessorService.criarAlocacoesEmMassa` resolve nome→GUID item a item).
 * Mesmo padrão de `ehCorpoEmMassa` em usuario.schema.ts: sem essa checagem,
 * `CriarAlocacaoBodySchema` (que só conhece `body.alocacao` singular)
 * rejeitava todo corpo em massa com "Dados da alocação inválidos" antes de
 * chegar no controller, que já tem tratamento próprio pro array.
 */
export function ehCorpoEmMassaAlocacao(body: unknown): boolean {
  return !!body && typeof body === "object" && !Array.isArray(body) && Array.isArray((body as Record<string, unknown>).alocacoes);
}

export const CriarAlocacaoBodySchema = z.object({
  alocacao: z.object(
    {
      MateriaGUID: z
        .string({ message: "Selecione uma matéria" })
        .regex(GUID_REGEX, "Matéria inválida"),
      TurmaGUID: z
        .string({ message: "Selecione uma turma" })
        .regex(GUID_REGEX, "Turma inválida"),
      UsuarioGUID: z
        .string({ message: "Selecione o professor" })
        .regex(USUARIO_GUID_REGEX, "Identificador do professor inválido"),
      AlocacaoStatus: z.enum(ALOCACAO_STATUS_ENUM, { message: ALOCACAO_STATUS_MSG }).optional(),
      AulasPorSemana: aulasPorSemanaCampo(),
    },
    { message: "Dados da alocação inválidos" }
  ),
});

export const AtualizarAlocacaoBodySchema = z.object({
  alocacao: z
    .object(
      {
        AlocacaoStatus: z.enum(ALOCACAO_STATUS_ENUM, { message: ALOCACAO_STATUS_MSG }).optional(),
        AulasPorSemana: aulasPorSemanaCampo(),
      },
      { message: "Dados da alocação inválidos" }
    )
    .refine(
      (v) => v.AlocacaoStatus !== undefined || v.AulasPorSemana !== undefined,
      "É necessário fornecer ao menos um campo para atualização"
    ),
});

export const AlocacaoGUIDParamSchema = z.object({
  guid: z
    .string({ message: "Informe uma alocação válida" })
    .regex(GUID_REGEX, "Informe uma alocação válida"),
});
