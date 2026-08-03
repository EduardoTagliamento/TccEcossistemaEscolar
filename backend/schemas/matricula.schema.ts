import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_ENUM = ["Ativa", "Transferida", "Concluida", "Cancelada"] as const;

/**
 * `validarCriacao` original pula toda validação detalhada quando o body é
 * um cadastro em massa (`{ matriculas: [...] }`) — só checa que o array não
 * está vazio, deixando o controller validar item a item. Detectado fora do
 * schema, no wrapper em `matricula.middleware.ts` (mesmo padrão do bypass
 * de `usuario.middleware.ts::validateCreateBody`).
 */
export function ehCorpoEmMassa(body: unknown): boolean {
  return !!body && typeof body === "object" && !Array.isArray(body) && Array.isArray((body as Record<string, unknown>).matriculas);
}

export const CriarMatriculaBodySchema = z.object({
  matricula: z.object(
    {
      MatriculaGUID: z
        .string()
        .trim()
        .min(1, "MatriculaGUID deve ter entre 1 e 36 caracteres")
        .max(36, "MatriculaGUID deve ter entre 1 e 36 caracteres")
        .optional()
        .nullable(),
      UsuarioCPF: z
        .string({ message: "UsuarioCPF é obrigatório" })
        .refine((v) => v.replace(/\D/g, "").length === 11, "UsuarioCPF deve ter 11 dígitos"),
      TurmaGUID: z.string({ message: "TurmaGUID é obrigatório" }).regex(GUID_REGEX, "TurmaGUID deve ser um UUID válido"),
      MatriculaDataEntrada: z
        .string()
        .refine((v) => !isNaN(new Date(v).getTime()), "MatriculaDataEntrada deve ser uma data válida")
        .optional(),
    },
    { message: 'Campo "matricula" é obrigatório e deve ser um objeto' }
  ),
});

// Simplificação: "pelo menos um campo" checado via `!== undefined` uniforme
// (o original usa checagem "falsy", então `MatriculaDataSaida: null` explícito
// não contava como "campo fornecido" — mesma simplificação já aplicada em
// `pendencia`, ver docs/PLANO_MIGRACAO_TAREFAS_ZOD_REACT_QUERY.md).
export const AtualizarMatriculaBodySchema = z.object({
  matricula: z
    .object(
      {
        MatriculaDataEntrada: z
          .string()
          .refine((v) => !isNaN(new Date(v).getTime()), "MatriculaDataEntrada deve ser uma data válida")
          .optional(),
        MatriculaDataSaida: z
          .string()
          .refine((v) => !isNaN(new Date(v).getTime()), "MatriculaDataSaida deve ser uma data válida ou null")
          .nullable()
          .optional(),
        MatriculaStatus: z
          .enum(STATUS_ENUM, { message: 'MatriculaStatus deve ser "Ativa", "Transferida", "Concluida" ou "Cancelada"' })
          .optional(),
      },
      { message: 'Campo "matricula" é obrigatório e deve ser um objeto' }
    )
    .refine(
      (v) => v.MatriculaDataEntrada !== undefined || v.MatriculaDataSaida !== undefined || v.MatriculaStatus !== undefined,
      "É necessário fornecer ao menos um campo para atualização"
    ),
});

export const TransferenciaBodySchema = z.object({
  transferencia: z
    .object(
      {
        UsuarioCPF: z
          .string({ message: "UsuarioCPF é obrigatório" })
          .refine((v) => v.replace(/\D/g, "").length === 11, "UsuarioCPF deve ter 11 dígitos"),
        TurmaOrigemGUID: z
          .string({ message: "TurmaOrigemGUID é obrigatório" })
          .regex(GUID_REGEX, "TurmaOrigemGUID deve ser um UUID válido"),
        TurmaDestinoGUID: z
          .string({ message: "TurmaDestinoGUID é obrigatório" })
          .regex(GUID_REGEX, "TurmaDestinoGUID deve ser um UUID válido"),
        DataTransferencia: z
          .string({ message: "DataTransferencia é obrigatório" })
          .min(1, "DataTransferencia é obrigatório")
          .refine((v) => !isNaN(new Date(v).getTime()), "DataTransferencia deve ser uma data válida"),
      },
      { message: 'Campo "transferencia" é obrigatório e deve ser um objeto' }
    )
    .refine((v) => v.TurmaOrigemGUID !== v.TurmaDestinoGUID, {
      message: "Turma origem e destino devem ser diferentes",
      path: ["TurmaOrigemGUID"],
    }),
});

export const MatriculaGUIDParamSchema = z.object({
  guid: z
    .string({ message: "GUID da matrícula é obrigatório" })
    .trim()
    .min(1, "GUID da matrícula deve ter entre 1 e 36 caracteres")
    .max(36, "GUID da matrícula deve ter entre 1 e 36 caracteres"),
});
