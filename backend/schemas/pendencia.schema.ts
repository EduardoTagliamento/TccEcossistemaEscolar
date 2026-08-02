import { z } from "zod";

// Regex estrita (exige versão 4 e variante 8/9/a/b), igual ao middleware original de pendência.
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const booleanTexto = (campo: string) =>
  z
    .string()
    .refine((v) => ["true", "false", "1", "0"].includes(v.toLowerCase()), `${campo} deve ser boolean (true/false ou 1/0)`);

export const PendenciaGUIDParamSchema = z.object({
  PendenciaGUID: z
    .string({ message: "Informe uma pendência válida" })
    .regex(UUID_V4_REGEX, "Informe uma pendência válida"),
});

export const CreatePendenciaBodySchema = z.object({
  UsuarioCPFDestino: z
    .string({ message: "Selecione o destinatário da pendência" })
    .min(1, "Selecione o destinatário da pendência")
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11, "CPF do destinatário inválido"),
  EscolaGUID: z
    .string({ message: "Escola inválida" })
    .min(1, "Escola inválida")
    .regex(UUID_V4_REGEX, "Escola inválida"),
  PendenciaTitulo: z
    .string({ message: "O título é obrigatório" })
    .trim()
    .min(3, "O título deve ter entre 3 e 128 caracteres")
    .max(128, "O título deve ter entre 3 e 128 caracteres"),
  PendenciaPrazoData: z
    .string({ message: "Informe o prazo" })
    .min(1, "Informe o prazo")
    .refine((v) => !isNaN(new Date(v).getTime()), "Informe um prazo válido"),
  PendenciaConteudo: z
    .string()
    .trim()
    .max(1024, "A descrição deve ter no máximo 1024 caracteres")
    .optional(),
});

export const UpdatePendenciaBodySchema = z
  .object({
    PendenciaTitulo: z
      .string()
      .trim()
      .min(3, "O título deve ter entre 3 e 128 caracteres")
      .max(128, "O título deve ter entre 3 e 128 caracteres")
      .optional(),
    PendenciaConteudo: z
      .string()
      .trim()
      .max(1024, "A descrição deve ter no máximo 1024 caracteres")
      .optional(),
    PendenciaPrazoData: z
      .string()
      .refine((v) => !isNaN(new Date(v).getTime()), "Informe um prazo válido")
      .optional(),
  })
  .refine(
    (data) => data.PendenciaTitulo !== undefined || data.PendenciaConteudo !== undefined || data.PendenciaPrazoData !== undefined,
    { message: "Pelo menos um campo deve ser fornecido para atualização" }
  );

export const PendenciaQueryParamsSchema = z.object({
  EscolaGUID: z.string().regex(UUID_V4_REGEX, "Escola inválida").optional(),
  PendenciaFeito: booleanTexto("O filtro 'feito'").optional(),
  atrasadas: booleanTexto("O filtro 'atrasadas'").optional(),
  limit: z
    .string()
    .refine((v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 1 && n <= 100;
    }, "O limite deve ser um número entre 1 e 100")
    .optional(),
  offset: z
    .string()
    .refine((v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 0;
    }, "O deslocamento (offset) deve ser um número maior ou igual a 0")
    .optional(),
});

export const PendenciaQueryContadorSchema = z.object({
  EscolaGUID: z.string().regex(UUID_V4_REGEX, "Escola inválida").optional(),
});
