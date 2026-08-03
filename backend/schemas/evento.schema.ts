import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_ENUM = ["Agendado", "Realizado", "Cancelado"] as const;

export const EventoGUIDParamSchema = z.object({
  EventoGUID: z
    .string({ message: "EventoGUID é obrigatório na URL" })
    .regex(GUID_REGEX, "EventoGUID inválido (deve ser UUID v4)"),
});

export const CreateEventoBodySchema = z.object({
  EscolaGUID: z.string({ message: "EscolaGUID é obrigatório" }).min(1, "EscolaGUID é obrigatório").regex(GUID_REGEX, "EscolaGUID inválido (deve ser UUID v4)"),
  EventoTitulo: z
    .string({ message: "EventoTitulo é obrigatório" })
    .trim()
    .min(3, "EventoTitulo deve ter entre 3 e 128 caracteres")
    .max(128, "EventoTitulo deve ter entre 3 e 128 caracteres"),
  EventoData: z
    .string({ message: "EventoData é obrigatório" })
    .min(1, "EventoData é obrigatório")
    .refine((v) => !isNaN(new Date(v).getTime()), "EventoData deve ser uma data válida (ISO 8601)"),
  EventoDescricao: z.string().trim().max(1024, "EventoDescricao deve ter no máximo 1024 caracteres").optional(),
});

export const UpdateEventoBodySchema = z
  .object({
    EventoTitulo: z
      .string()
      .trim()
      .min(3, "EventoTitulo deve ter entre 3 e 128 caracteres")
      .max(128, "EventoTitulo deve ter entre 3 e 128 caracteres")
      .optional(),
    EventoDescricao: z.string().trim().max(1024, "EventoDescricao deve ter no máximo 1024 caracteres").optional(),
    EventoData: z
      .string()
      .refine((v) => !isNaN(new Date(v).getTime()), "EventoData deve ser uma data válida (ISO 8601)")
      .optional(),
    EventoStatus: z.enum(STATUS_ENUM, { message: "EventoStatus deve ser Agendado, Realizado ou Cancelado" }).optional(),
  })
  .refine(
    (v) => v.EventoTitulo !== undefined || v.EventoDescricao !== undefined || v.EventoData !== undefined || v.EventoStatus !== undefined,
    "Pelo menos um campo deve ser fornecido para atualização"
  );

export const EventoQueryParamsSchema = z.object({
  EscolaGUID: z.string().regex(GUID_REGEX, "EscolaGUID inválido (deve ser UUID v4)").optional(),
  EventoStatus: z.enum(STATUS_ENUM, { message: "EventoStatus deve ser Agendado, Realizado ou Cancelado" }).optional(),
  dataInicio: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), "dataInicio deve ser uma data válida (ISO 8601)")
    .optional(),
  dataFim: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), "dataFim deve ser uma data válida (ISO 8601)")
    .optional(),
  limit: z
    .string()
    .refine((v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 1 && n <= 100;
    }, "limit deve ser um número entre 1 e 100")
    .optional(),
  offset: z
    .string()
    .refine((v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 0;
    }, "offset deve ser um número >= 0")
    .optional(),
});
