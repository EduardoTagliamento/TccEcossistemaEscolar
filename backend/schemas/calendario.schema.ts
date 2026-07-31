import { z } from "zod";

// Regex solta (sem exigir versão 4), igual ao middleware original de calendario.
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIPO_AVISO_VALIDOS = ["tarefa", "prova"] as const;

const dataValida = (mensagem: string) =>
  z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), mensagem)
    .optional();

export const CalendarioFiltrosQuerySchema = z
  .object({
    EscolaGUID: z
      .string({ message: "O parâmetro 'EscolaGUID' é obrigatório." })
      .regex(GUID_REGEX, "O parâmetro 'EscolaGUID' deve ser um UUID válido."),
    DataInicio: dataValida("O filtro 'DataInicio' deve ser uma data válida (ISO 8601)."),
    DataFim: dataValida("O filtro 'DataFim' deve ser uma data válida (ISO 8601)."),
    TipoAviso: z.enum(TIPO_AVISO_VALIDOS, { message: "O filtro 'TipoAviso' deve ser 'tarefa' ou 'prova'." }).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.DataInicio && data.DataFim && new Date(data.DataInicio) > new Date(data.DataFim)) {
      ctx.addIssue({ code: "custom", path: ["DataInicio"], message: "O filtro 'DataInicio' deve ser anterior a 'DataFim'." });
    }
  });

export const CalendarioDiaParamSchema = z.object({
  data: z.string({ message: "O parâmetro 'data' deve estar no formato YYYY-MM-DD." }).regex(DIA_REGEX, "O parâmetro 'data' deve estar no formato YYYY-MM-DD."),
});
