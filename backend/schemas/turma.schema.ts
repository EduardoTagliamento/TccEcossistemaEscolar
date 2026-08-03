import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_ENUM = ["Ativa", "Inativa", "Encerrada"] as const;

export function ehCorpoEmMassa(body: unknown): boolean {
  return !!body && typeof body === "object" && !Array.isArray(body) && Array.isArray((body as Record<string, unknown>).turmas);
}

export const CriarTurmaBodySchema = z.object({
  turma: z.object(
    {
      EscolaGUID: z.string({ message: "EscolaGUID é obrigatório" }).regex(GUID_REGEX, "EscolaGUID deve ser um UUID válido"),
      TurmaSerie: z
        .string({ message: "TurmaSerie é obrigatório" })
        .trim()
        .min(1, "TurmaSerie deve ter entre 1 e 20 caracteres")
        .max(20, "TurmaSerie deve ter entre 1 e 20 caracteres"),
      TurmaNome: z
        .string({ message: "TurmaNome é obrigatório" })
        .trim()
        .min(1, "TurmaNome deve ter entre 1 e 50 caracteres")
        .max(50, "TurmaNome deve ter entre 1 e 50 caracteres"),
      TurmaIsTecnico: z.boolean({ message: "TurmaIsTecnico é obrigatório e deve ser boolean" }),
      CursoGUID: z.string({ message: "CursoGUID deve ser um UUID válido ou null" }).regex(GUID_REGEX, "CursoGUID deve ser um UUID válido").nullable().optional(),
      TurmaStatus: z.enum(STATUS_ENUM, { message: 'TurmaStatus deve ser "Ativa", "Inativa" ou "Encerrada"' }).optional(),
    },
    { message: 'Campo "turma" é obrigatório e deve ser um objeto' }
  ),
});

export const AtualizarTurmaBodySchema = z.object({
  turma: z
    .object(
      {
        TurmaSerie: z
          .string({ message: "TurmaSerie deve ser uma string" })
          .trim()
          .min(1, "TurmaSerie deve ter entre 1 e 20 caracteres")
          .max(20, "TurmaSerie deve ter entre 1 e 20 caracteres")
          .optional(),
        TurmaNome: z
          .string({ message: "TurmaNome deve ser uma string" })
          .trim()
          .min(1, "TurmaNome deve ter entre 1 e 50 caracteres")
          .max(50, "TurmaNome deve ter entre 1 e 50 caracteres")
          .optional(),
        TurmaIsTecnico: z.boolean({ message: "TurmaIsTecnico deve ser boolean" }).optional(),
        CursoGUID: z.string({ message: "CursoGUID deve ser um UUID válido ou null" }).regex(GUID_REGEX, "CursoGUID deve ser um UUID válido").nullable().optional(),
        TurmaStatus: z.enum(STATUS_ENUM, { message: 'TurmaStatus deve ser "Ativa", "Inativa" ou "Encerrada"' }).optional(),
      },
      { message: 'Campo "turma" é obrigatório e deve ser um objeto' }
    )
    .refine(
      (v) =>
        v.TurmaSerie !== undefined ||
        v.TurmaNome !== undefined ||
        v.TurmaIsTecnico !== undefined ||
        v.CursoGUID !== undefined ||
        v.TurmaStatus !== undefined,
      "É necessário fornecer ao menos um campo para atualização"
    ),
});

export const TurmaGUIDParamSchema = z.object({
  guid: z.string({ message: "GUID da turma é obrigatório" }).regex(GUID_REGEX, "GUID da turma deve ser um UUID válido"),
});
