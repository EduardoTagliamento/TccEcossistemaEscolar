import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLICO_ALVO_VALID = ["Escola", "Turmas"] as const;

const guid = (campo: string) => z.string().regex(GUID_REGEX, `O campo '${campo}' deve ser um UUID válido.`);

const dataValida = (campo: string, obrigatorio = true) => {
  const base = z.any().refine((v) => !isNaN(new Date(v as any).getTime()), {
    message: `O campo '${campo}' ${obrigatorio ? "é obrigatório e deve" : "deve"} ser uma data válida.`,
  });
  if (!obrigatorio) return base;
  return z
    .any()
    .refine((v) => v !== undefined && v !== null && v !== "", { message: `O campo '${campo}' é obrigatório e deve ser uma data válida.` })
    .refine((v) => !isNaN(new Date(v as any).getTime()), { message: `O campo '${campo}' é obrigatório e deve ser uma data válida.` });
};

export const ProjetoGUIDParamSchema = z.object({
  projetoGUID: guid("projetoGUID"),
});

export const EscolaGUIDQuerySchema = z.object({
  EscolaGUID: guid("EscolaGUID"),
});

export const CreateProjetoBodySchema = z
  .object({
    EscolaGUID: guid("EscolaGUID"),
    ProjetoTitulo: z
      .string({ message: "O campo 'ProjetoTitulo' é obrigatório e deve ter entre 1 e 128 caracteres." })
      .trim()
      .min(1, "O campo 'ProjetoTitulo' é obrigatório e deve ter entre 1 e 128 caracteres.")
      .max(128, "O campo 'ProjetoTitulo' é obrigatório e deve ter entre 1 e 128 caracteres."),
    ProjetoDescricao: z
      .string({ message: "O campo 'ProjetoDescricao' é obrigatório e deve ter entre 1 e 2048 caracteres." })
      .trim()
      .min(1, "O campo 'ProjetoDescricao' é obrigatório e deve ter entre 1 e 2048 caracteres.")
      .max(2048, "O campo 'ProjetoDescricao' é obrigatório e deve ter entre 1 e 2048 caracteres."),
    ProjetoMecanicaPontuacao: z.string().max(1024, "O campo 'ProjetoMecanicaPontuacao' deve ter no máximo 1024 caracteres.").optional().nullable(),
    ProjetoPublicoAlvo: z.enum(PUBLICO_ALVO_VALID, { message: "O campo 'ProjetoPublicoAlvo' deve ser 'Escola' ou 'Turmas'." }),
    TurmasGUID: z.array(z.string()).optional(),
    ProjetoGrupoMinPessoas: z
      .number({ message: "O campo 'ProjetoGrupoMinPessoas' é obrigatório e deve ser um inteiro >= 1." })
      .int("O campo 'ProjetoGrupoMinPessoas' é obrigatório e deve ser um inteiro >= 1.")
      .min(1, "O campo 'ProjetoGrupoMinPessoas' é obrigatório e deve ser um inteiro >= 1."),
    ProjetoGrupoMaxPessoas: z
      .number({ message: "O campo 'ProjetoGrupoMaxPessoas' é obrigatório e deve ser um inteiro >= ProjetoGrupoMinPessoas." })
      .int("O campo 'ProjetoGrupoMaxPessoas' é obrigatório e deve ser um inteiro >= ProjetoGrupoMinPessoas."),
    ProjetoInscricaoPrazoData: dataValida("ProjetoInscricaoPrazoData"),
    ProjetoEntregaPrazoData: dataValida("ProjetoEntregaPrazoData", false).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.ProjetoPublicoAlvo === "Turmas") {
      if (!Array.isArray(data.TurmasGUID) || data.TurmasGUID.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["TurmasGUID"],
          message: "O campo 'TurmasGUID' é obrigatório e não pode ser vazio quando 'ProjetoPublicoAlvo' é 'Turmas'.",
        });
      } else if (data.TurmasGUID.some((guidValor) => !GUID_REGEX.test(guidValor))) {
        ctx.addIssue({ code: "custom", path: ["TurmasGUID"], message: "Todos os itens de 'TurmasGUID' devem ser UUIDs válidos." });
      }
    }

    if (data.ProjetoGrupoMaxPessoas < data.ProjetoGrupoMinPessoas) {
      ctx.addIssue({
        code: "custom",
        path: ["ProjetoGrupoMaxPessoas"],
        message: "O campo 'ProjetoGrupoMaxPessoas' é obrigatório e deve ser um inteiro >= ProjetoGrupoMinPessoas.",
      });
    }
  });

export const UpdateProjetoBodySchema = z
  .object({
    ProjetoTitulo: z.string().trim().min(1, "O campo 'ProjetoTitulo' deve ter entre 1 e 128 caracteres.").max(128, "O campo 'ProjetoTitulo' deve ter entre 1 e 128 caracteres.").optional(),
    ProjetoDescricao: z.string().trim().min(1, "O campo 'ProjetoDescricao' deve ter entre 1 e 2048 caracteres.").max(2048, "O campo 'ProjetoDescricao' deve ter entre 1 e 2048 caracteres.").optional(),
    ProjetoMecanicaPontuacao: z.string().max(1024, "O campo 'ProjetoMecanicaPontuacao' deve ter no máximo 1024 caracteres.").optional().nullable(),
    ProjetoGrupoMinPessoas: z.number().int("O campo 'ProjetoGrupoMinPessoas' deve ser um inteiro >= 1.").min(1, "O campo 'ProjetoGrupoMinPessoas' deve ser um inteiro >= 1.").optional(),
    ProjetoGrupoMaxPessoas: z.number().int("O campo 'ProjetoGrupoMaxPessoas' deve ser um inteiro >= 1.").min(1, "O campo 'ProjetoGrupoMaxPessoas' deve ser um inteiro >= 1.").optional(),
    ProjetoInscricaoPrazoData: dataValida("ProjetoInscricaoPrazoData", false).optional(),
    ProjetoEntregaPrazoData: dataValida("ProjetoEntregaPrazoData", false).optional().nullable(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message:
      "Envie ao menos um campo para atualizar: ProjetoTitulo, ProjetoDescricao, ProjetoMecanicaPontuacao, ProjetoGrupoMinPessoas, ProjetoGrupoMaxPessoas, ProjetoInscricaoPrazoData, ProjetoEntregaPrazoData.",
  });
