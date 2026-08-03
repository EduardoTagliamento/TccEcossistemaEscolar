import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_ENUM = ["Ativa", "Inativa"] as const;

export function ehCorpoEmMassa(body: unknown): boolean {
  return !!body && typeof body === "object" && !Array.isArray(body) && Array.isArray((body as Record<string, unknown>).materias);
}

const MENSAGENS_TOPO: Record<string, string> = {
  materia: "Dados inválidos",
  EscolaGUID: "EscolaGUID inválido",
  MateriaNome: "MateriaNome inválido",
  MateriaIsTecnica: "MateriaIsTecnica inválido",
  MateriaStatus: "MateriaStatus inválido",
  MateriaAulasPorSemanaPadrao: "MateriaAulasPorSemanaPadrao inválido",
  guid: "GUID inválido",
};

export function mensagemTopoMateria(campo: string | undefined): string {
  return (campo && MENSAGENS_TOPO[campo]) || "Erro na validação de dados";
}

const campoAulasPorSemana = () =>
  z
    .unknown()
    .refine(
      (v) => v === undefined || v === null || (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 20),
      "MateriaAulasPorSemanaPadrao deve ser um número inteiro entre 1 e 20"
    )
    .optional();

export const CriarMateriaBodySchema = z.object({
  materia: z.object(
    {
      EscolaGUID: z.string({ message: "EscolaGUID é obrigatório e deve ser uma string" }).regex(GUID_REGEX, "EscolaGUID deve ser um UUID válido"),
      MateriaNome: z
        .string({ message: "MateriaNome é obrigatório e deve ser uma string" })
        .trim()
        .min(3, "MateriaNome deve ter entre 3 e 100 caracteres")
        .max(100, "MateriaNome deve ter entre 3 e 100 caracteres"),
      MateriaIsTecnica: z.boolean({ message: "MateriaIsTecnica é obrigatório e deve ser um booleano" }),
      MateriaStatus: z.enum(STATUS_ENUM, { message: "MateriaStatus deve ser 'Ativa' ou 'Inativa'" }).optional(),
      MateriaAulasPorSemanaPadrao: campoAulasPorSemana(),
    },
    { message: "O campo 'materia' é obrigatório" }
  ),
});

export const AtualizarMateriaBodySchema = z.object({
  materia: z.object(
    {
      MateriaNome: z
        .string({ message: "MateriaNome deve ser uma string" })
        .trim()
        .min(3, "MateriaNome deve ter entre 3 e 100 caracteres")
        .max(100, "MateriaNome deve ter entre 3 e 100 caracteres")
        .optional(),
      // Nome do campo corrigido pra "MateriaIsTecnica" (era "MateriaIsTecnico" no
      // middleware original — nome errado, nunca batia com o que o serviço/
      // frontend/entidade usam de verdade; ver services/materia.service.ts,
      // frontend/lib/api/materia.api.ts). Efeito do bug: `MateriaIsTecnica`
      // enviado num PUT nunca era validado (o middleware checava um campo que
      // não existia).
      MateriaIsTecnica: z.boolean({ message: "MateriaIsTecnica deve ser um booleano" }).optional(),
      MateriaStatus: z.enum(STATUS_ENUM, { message: "MateriaStatus deve ser 'Ativa' ou 'Inativa'" }).optional(),
      MateriaAulasPorSemanaPadrao: campoAulasPorSemana(),
    },
    { message: "O campo 'materia' é obrigatório" }
  ),
});

export const MateriaGUIDParamSchema = z.object({
  guid: z.string({ message: "O parâmetro GUID é obrigatório" }).regex(GUID_REGEX, "O GUID fornecido não é um UUID válido"),
});
