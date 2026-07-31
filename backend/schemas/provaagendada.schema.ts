import { z } from "zod";

// Mesma regex solta (não v4-estrita) que backend/middlewares/provaagendada.middleware.ts
// já usa hoje — mantém compatibilidade com o que já está gravado.
export const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_VALID = ["Agendada", "Realizada", "Cancelada"] as const;

const guid = (campo: string) => z.string().regex(GUID_REGEX, `O campo '${campo}' deve ser um UUID válido.`);

const dataValida = (campo: string) =>
  z
    .any()
    .refine((v) => v !== undefined && v !== null && v !== "", { message: `O campo '${campo}' é obrigatório.` })
    .refine((v) => !isNaN(new Date(v as any).getTime()), { message: `O campo '${campo}' deve ser uma data válida (ISO 8601).` });

export const ProvaIdParamSchema = z.object({
  ProvaAgendadaGUID: guid("ProvaAgendadaGUID"),
});

const ProvaPayloadBaseSchema = z.object({
  TurmasGUID: z.array(guid("TurmasGUID")).min(1, "É necessário selecionar pelo menos uma turma."),
  MateriaGUID: guid("MateriaGUID"),
  ProvaData: dataValida("ProvaData"),
  ProvaDescricao: z.string().max(1024, "O campo 'ProvaDescricao' deve ter no máximo 1024 caracteres.").optional().nullable(),
  anexosDescricao: z.array(guid("anexosDescricao")).optional(),
  DatasPorTurma: z.record(z.string(), z.any()).optional(),
});

function refinarDatasPorTurma(prova: z.infer<typeof ProvaPayloadBaseSchema>, ctx: z.RefinementCtx) {
  if (prova.DatasPorTurma === undefined) return;
  for (const [turmaGUID, dataTurma] of Object.entries(prova.DatasPorTurma)) {
    if (!GUID_REGEX.test(turmaGUID)) {
      ctx.addIssue({ code: "custom", message: `A chave '${turmaGUID}' em 'DatasPorTurma' não é um UUID de turma válido.` });
      continue;
    }
    if (!prova.TurmasGUID.includes(turmaGUID)) {
      ctx.addIssue({ code: "custom", message: `A turma '${turmaGUID}' em 'DatasPorTurma' não está em 'TurmasGUID'.` });
    }
    if (isNaN(new Date(dataTurma as string).getTime())) {
      ctx.addIssue({ code: "custom", message: `A data para a turma '${turmaGUID}' em 'DatasPorTurma' é inválida.` });
    }
  }
}

export const ProvaCreateBodySchema = z
  .object({ prova: ProvaPayloadBaseSchema })
  .superRefine((data, ctx) => refinarDatasPorTurma(data.prova, ctx));

export const ProvaUpdateBodySchema = z.object({
  prova: z
    .object({
      ProvaData: dataValida("ProvaData"),
      ProvaDescricao: z.string().max(1024, "O campo 'ProvaDescricao' deve ter no máximo 1024 caracteres.").optional().nullable(),
      ProvaStatus: z.enum(STATUS_VALID, { message: "O campo 'ProvaStatus' deve ser 'Agendada', 'Realizada' ou 'Cancelada'." }),
    })
    .partial()
    .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
      message: "É necessário fornecer ao menos um campo para atualização: ProvaData, ProvaDescricao, ProvaStatus",
    }),
});

export const ProvaFiltersQuerySchema = z
  .object({
    MateriaGUID: guid("MateriaGUID").optional(),
    ProvaStatus: z.enum(STATUS_VALID, { message: "O filtro 'ProvaStatus' deve ser 'Agendada', 'Realizada' ou 'Cancelada'." }).optional(),
    DataInicio: z
      .string()
      .optional()
      .refine((v) => v === undefined || !isNaN(new Date(v).getTime()), { message: "O filtro 'DataInicio' deve ser uma data válida (ISO 8601)." }),
    DataFim: z
      .string()
      .optional()
      .refine((v) => v === undefined || !isNaN(new Date(v).getTime()), { message: "O filtro 'DataFim' deve ser uma data válida (ISO 8601)." }),
  })
  .superRefine((data, ctx) => {
    if (data.DataInicio && data.DataFim && new Date(data.DataInicio) > new Date(data.DataFim)) {
      ctx.addIssue({ code: "custom", message: "O filtro 'DataInicio' deve ser anterior a 'DataFim'." });
    }
  });
