import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GUID_GENERICO_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CriarAvisoBodySchema = z
  .object({
    EscolaGUID: z.string({ message: "EscolaGUID é obrigatório" }).min(1, "EscolaGUID é obrigatório"),
    AvisoTitulo: z
      .string({ message: "AvisoTitulo é obrigatório" })
      .min(1, "AvisoTitulo é obrigatório")
      .refine((v) => v.trim().length > 0, "AvisoTitulo não pode ser vazio")
      .refine((v) => v.length <= 150, "AvisoTitulo não pode exceder 150 caracteres"),
    AvisoConteudo: z
      .string({ message: "AvisoConteudo é obrigatório" })
      .min(1, "AvisoConteudo é obrigatório")
      .refine((v) => v.trim().length > 0, "AvisoConteudo não pode ser vazio")
      .refine((v) => v.length <= 10000, "AvisoConteudo não pode exceder 10000 caracteres"),
    AvisoAbrangencia: z.enum(["Escola", "Turmas"], { message: "AvisoAbrangencia deve ser 'Escola' ou 'Turmas'" }),
    TurmaGUIDs: z.array(z.string().regex(GUID_GENERICO_REGEX, "TurmaGUID inválido")).optional(),
    AnexoGUIDs: z.array(z.string().regex(GUID_GENERICO_REGEX, "AnexoGUID inválido")).optional(),
  })
  .refine(
    (v) => v.AvisoAbrangencia !== "Turmas" || (v.TurmaGUIDs && v.TurmaGUIDs.length > 0),
    { message: "Selecione ao menos uma turma para um aviso de abrangência 'Turmas'", path: ["TurmaGUIDs"] }
  );

export const AvisoGUIDParamSchema = z.object({
  guid: z
    .string({ message: "AvisoGUID é obrigatório nos parâmetros" })
    .regex(GUID_REGEX, "AvisoGUID inválido (deve ser UUID v4)"),
});

export const AvisoFiltrosQuerySchema = z.object({
  EscolaGUID: z.string({ message: "EscolaGUID é obrigatório nos parâmetros de busca" }).min(1, "EscolaGUID é obrigatório nos parâmetros de busca"),
});
