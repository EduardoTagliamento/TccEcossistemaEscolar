import { z } from "zod";

// Regex solta (sem exigir versão), igual ao middleware original de anexo.
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CPF_FORMATADO_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

export const AnexoIdParamSchema = z.object({
  AnexoGUID: z
    .string({ message: "O parâmetro 'AnexoGUID' é obrigatório!" })
    .regex(GUID_REGEX, "O parâmetro 'AnexoGUID' deve ser um UUID válido."),
});

// A checagem de `request.file` (setado pelo multer, fora de body/params/query)
// continua fora deste schema — ver backend/middlewares/anexo.middleware.ts.
export const AnexoUploadBodySchema = z.object({
  EscolaGUID: z
    .string({ message: "O campo 'EscolaGUID' é obrigatório!" })
    .regex(GUID_REGEX, "O campo 'EscolaGUID' deve ser um UUID válido."),
});

export const AnexoFiltrosQuerySchema = z
  .object({
    UsuarioCPF: z
      .string({ message: "O filtro 'UsuarioCPF' deve ser uma string." })
      .regex(CPF_FORMATADO_REGEX, "O filtro 'UsuarioCPF' deve estar no formato XXX.XXX.XXX-XX.")
      .optional(),
    EscolaGUID: z
      .string({ message: "O filtro 'EscolaGUID' deve ser uma string." })
      .regex(GUID_REGEX, "O filtro 'EscolaGUID' deve ser um UUID válido.")
      .optional(),
    DataInicio: z
      .string()
      .refine((v) => !isNaN(new Date(v).getTime()), "O filtro 'DataInicio' deve ser uma data válida (ISO 8601).")
      .optional(),
    DataFim: z
      .string()
      .refine((v) => !isNaN(new Date(v).getTime()), "O filtro 'DataFim' deve ser uma data válida (ISO 8601).")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.DataInicio && data.DataFim && new Date(data.DataInicio) > new Date(data.DataFim)) {
      ctx.addIssue({ code: "custom", path: ["DataInicio"], message: "O filtro 'DataInicio' deve ser anterior a 'DataFim'." });
    }
  });
