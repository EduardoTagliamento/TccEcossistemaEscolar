import { z } from "zod";

// Regex estrita (exige versão 4 e variante 8/9/a/b), igual ao middleware original de pendência.
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const booleanTexto = (campo: string) =>
  z
    .string()
    .refine((v) => ["true", "false", "1", "0"].includes(v.toLowerCase()), `${campo} deve ser boolean (true/false ou 1/0)`);

export const PendenciaGUIDParamSchema = z.object({
  PendenciaGUID: z
    .string({ message: "PendenciaGUID é obrigatório na URL" })
    .regex(UUID_V4_REGEX, "PendenciaGUID inválido (deve ser UUID v4)"),
});

export const CreatePendenciaBodySchema = z.object({
  UsuarioCPFDestino: z
    .string({ message: "UsuarioCPFDestino é obrigatório" })
    .min(1, "UsuarioCPFDestino é obrigatório")
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11, "UsuarioCPFDestino deve ter 11 dígitos"),
  EscolaGUID: z
    .string({ message: "EscolaGUID é obrigatório" })
    .min(1, "EscolaGUID é obrigatório")
    .regex(UUID_V4_REGEX, "EscolaGUID inválido (deve ser UUID v4)"),
  PendenciaTitulo: z
    .string({ message: "PendenciaTitulo é obrigatório" })
    .trim()
    .min(3, "PendenciaTitulo deve ter entre 3 e 128 caracteres")
    .max(128, "PendenciaTitulo deve ter entre 3 e 128 caracteres"),
  PendenciaPrazoData: z
    .string({ message: "PendenciaPrazoData é obrigatório" })
    .min(1, "PendenciaPrazoData é obrigatório")
    .refine((v) => !isNaN(new Date(v).getTime()), "PendenciaPrazoData deve ser uma data válida (ISO 8601)"),
  PendenciaConteudo: z
    .string()
    .trim()
    .max(1024, "PendenciaConteudo deve ter no máximo 1024 caracteres")
    .optional(),
});

export const UpdatePendenciaBodySchema = z
  .object({
    PendenciaTitulo: z
      .string()
      .trim()
      .min(3, "PendenciaTitulo deve ter entre 3 e 128 caracteres")
      .max(128, "PendenciaTitulo deve ter entre 3 e 128 caracteres")
      .optional(),
    PendenciaConteudo: z
      .string()
      .trim()
      .max(1024, "PendenciaConteudo deve ter no máximo 1024 caracteres")
      .optional(),
    PendenciaPrazoData: z
      .string()
      .refine((v) => !isNaN(new Date(v).getTime()), "PendenciaPrazoData deve ser uma data válida (ISO 8601)")
      .optional(),
  })
  .refine(
    (data) => data.PendenciaTitulo !== undefined || data.PendenciaConteudo !== undefined || data.PendenciaPrazoData !== undefined,
    { message: "Pelo menos um campo deve ser fornecido para atualização" }
  );

export const PendenciaQueryParamsSchema = z.object({
  EscolaGUID: z.string().regex(UUID_V4_REGEX, "EscolaGUID inválido (deve ser UUID v4)").optional(),
  PendenciaFeito: booleanTexto("PendenciaFeito").optional(),
  atrasadas: booleanTexto("atrasadas").optional(),
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

export const PendenciaQueryContadorSchema = z.object({
  EscolaGUID: z.string().regex(UUID_V4_REGEX, "EscolaGUID inválido (deve ser UUID v4)").optional(),
});
