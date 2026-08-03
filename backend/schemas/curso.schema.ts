import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_ENUM = ["Ativo", "Inativo"] as const;

export function ehCorpoEmMassa(body: unknown): boolean {
  return !!body && typeof body === "object" && !Array.isArray(body) && Array.isArray((body as Record<string, unknown>).cursos);
}

export const CriarCursoBodySchema = z.object({
  curso: z.object(
    {
      EscolaGUID: z.string({ message: "EscolaGUID é obrigatório" }).regex(GUID_REGEX, "EscolaGUID deve ser um UUID válido"),
      CursoNome: z
        .string({ message: "CursoNome é obrigatório" })
        .trim()
        .min(3, "CursoNome deve ter entre 3 e 100 caracteres")
        .max(100, "CursoNome deve ter entre 3 e 100 caracteres"),
      CursoStatus: z.enum(STATUS_ENUM, { message: 'CursoStatus deve ser "Ativo" ou "Inativo"' }).optional(),
    },
    { message: 'Campo "curso" é obrigatório e deve ser um objeto' }
  ),
});

export const AtualizarCursoBodySchema = z.object({
  curso: z
    .object(
      {
        CursoNome: z
          .string({ message: "CursoNome deve ser uma string" })
          .trim()
          .min(3, "CursoNome deve ter entre 3 e 100 caracteres")
          .max(100, "CursoNome deve ter entre 3 e 100 caracteres")
          .optional(),
        CursoStatus: z.enum(STATUS_ENUM, { message: 'CursoStatus deve ser "Ativo" ou "Inativo"' }).optional(),
      },
      { message: 'Campo "curso" é obrigatório e deve ser um objeto' }
    )
    .refine((v) => v.CursoNome !== undefined || v.CursoStatus !== undefined, "É necessário fornecer ao menos um campo para atualização"),
});

export const CursoGUIDParamSchema = z.object({
  guid: z.string({ message: "GUID do curso é obrigatório" }).regex(GUID_REGEX, "GUID do curso deve ser um UUID válido"),
});
