import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CriarSugestaoBodySchema = z.object({
  SugestaoTexto: z
    .string({ message: "SugestaoTexto é obrigatório" })
    .min(1, "SugestaoTexto é obrigatório")
    .refine((v) => v.trim().length > 0, "SugestaoTexto não pode ser vazio")
    .refine((v) => v.length <= 2000, "SugestaoTexto não pode exceder 2000 caracteres"),
  EscolaGUID: z.string().regex(GUID_REGEX, "EscolaGUID inválido").optional(),
  SugestaoPaginaUrl: z.string().max(255).optional(),
});

export const SugestaoGUIDParamSchema = z.object({
  guid: z
    .string({ message: "SugestaoGUID é obrigatório nos parâmetros" })
    .regex(GUID_REGEX, "SugestaoGUID inválido"),
});
