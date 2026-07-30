import { z } from "zod";

export const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPO_ENTREGA_VALID = ["digital", "fisica", "lista"] as const;
const QUESTAO_TIPO_VALID = ["objetiva", "discursiva"] as const;

const guid = (campo: string) => z.string().regex(GUID_REGEX, `O campo '${campo}' deve ser um UUID válido.`);

const dataValida = (campo: string) =>
  z
    .any()
    .refine((v) => v !== undefined && v !== null && v !== "", { message: `O campo '${campo}' é obrigatório.` })
    .refine((v) => !isNaN(new Date(v as any).getTime()), { message: `O campo '${campo}' deve ser uma data válida (ISO 8601).` });

const dataValidaOpcional = (campo: string) =>
  z
    .any()
    .optional()
    .refine((v) => v === undefined || v === null || !isNaN(new Date(v as any).getTime()), {
      message: `O campo '${campo}' deve ser uma data válida (ISO 8601).`,
    });

// ========== Params ==========

export const TarefaIdParamSchema = z.object({
  TarefaGUID: guid("TarefaGUID"),
});

export const TarefaIdComAnexoParamSchema = z.object({
  TarefaGUID: guid("TarefaGUID"),
  AnexoGUID: guid("AnexoGUID"),
});

export const TarefaEQuestaoIdParamSchema = z.object({
  TarefaGUID: guid("TarefaGUID"),
  QuestaoGUID: guid("QuestaoGUID"),
});

export const TarefaEMatriculaIdParamSchema = z.object({
  TarefaGUID: guid("TarefaGUID"),
  TarefaMatriculaGUID: z
    .string()
    .trim()
    .min(1, "O parâmetro 'TarefaMatriculaGUID' é obrigatório.")
    .max(36, "O parâmetro 'TarefaMatriculaGUID' é obrigatório."),
});

export const QuestaoIdParamSchema = z.object({
  QuestaoGUID: guid("QuestaoGUID"),
});

export const RespostaIdParamSchema = z.object({
  RespostaGUID: guid("RespostaGUID"),
});

// ========== Tarefa (create/update) ==========

const MatriculaGUIDSimples = z
  .string()
  .trim()
  .min(1, "Cada 'MatriculaGUID' deve ser uma string entre 1 e 36 caracteres.")
  .max(36, "Cada 'MatriculaGUID' deve ser uma string entre 1 e 36 caracteres.");

const TarefaPayloadBaseSchema = z.object({
  MatriculasGUID: z.array(MatriculaGUIDSimples).min(1, "O campo 'MatriculasGUID' deve conter ao menos uma matrícula."),
  matXprofXturxescGUID: guid("matXprofXturxescGUID"),
  TarefaTitulo: z
    .string()
    .trim()
    .min(1, "O campo 'TarefaTitulo' é obrigatório.")
    .max(128, "O campo 'TarefaTitulo' deve ter entre 1 e 128 caracteres."),
  TarefaConteudo: z.string().max(1024, "O campo 'TarefaConteudo' deve ter no máximo 1024 caracteres.").optional().nullable(),
  TarefaPrazoData: dataValida("TarefaPrazoData"),
  TarefaTipoEntrega: z.enum(TIPO_ENTREGA_VALID, { message: "O campo 'TarefaTipoEntrega' deve ser 'digital', 'fisica' ou 'lista'." }),
  anexosDescricao: z.array(guid("anexosDescricao")).optional(),
  DatasPorMatricula: z.record(z.string(), z.any()).optional(),
});

function refinarDatasPorMatricula(tarefa: z.infer<typeof TarefaPayloadBaseSchema>, ctx: z.RefinementCtx) {
  if (tarefa.DatasPorMatricula === undefined) return;
  for (const [matriculaGUID, dataMatricula] of Object.entries(tarefa.DatasPorMatricula)) {
    if (!tarefa.MatriculasGUID.includes(matriculaGUID)) {
      ctx.addIssue({ code: "custom", message: `A matrícula '${matriculaGUID}' em 'DatasPorMatricula' não está em 'MatriculasGUID'.` });
    }
    if (isNaN(new Date(dataMatricula as string).getTime())) {
      ctx.addIssue({ code: "custom", message: `A data para a matrícula '${matriculaGUID}' em 'DatasPorMatricula' é inválida.` });
    }
  }
}

export const TarefaCreateBodySchema = z.object({ tarefa: TarefaPayloadBaseSchema }).superRefine((data, ctx) => refinarDatasPorMatricula(data.tarefa, ctx));

// mesmo schema base reaproveitado (decisão #3 do plano de migração) — validateBatchCreateBody original não valida DatasPorMatricula
export const TarefaBatchCreateBodySchema = z.object({ tarefa: TarefaPayloadBaseSchema });

export const TarefaUpdateBodySchema = z.object({
  tarefa: TarefaPayloadBaseSchema.pick({
    TarefaTitulo: true,
    TarefaConteudo: true,
    TarefaPrazoData: true,
    TarefaTipoEntrega: true,
  })
    .partial()
    .extend({ TarefaPrazoData: dataValidaOpcional("TarefaPrazoData") })
    .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
      message: "É necessário fornecer ao menos um campo para atualização: TarefaTitulo, TarefaConteudo, TarefaPrazoData, TarefaTipoEntrega",
    }),
});

export const MarcarFeitoBodySchema = z.object({
  MatriculaGUID: z
    .string()
    .trim()
    .min(1, "O campo 'MatriculaGUID' deve ter entre 1 e 36 caracteres.")
    .max(36, "O campo 'MatriculaGUID' deve ter entre 1 e 36 caracteres."),
  TarefaFeito: z.boolean({ message: "O campo 'TarefaFeito' é obrigatório e deve ser um booleano." }),
});

export const AnexoEntregaBodySchema = z.object({
  AnexoGUID: guid("AnexoGUID"),
});

export const TarefaFiltersQuerySchema = z
  .object({
    MatriculaGUID: z.string().trim().min(1, "O filtro 'MatriculaGUID' deve ser uma string não vazia.").optional(),
    matXprofXturxescGUID: guid("matXprofXturxescGUID").optional(),
    TarefaFeito: z.enum(["true", "false"], { message: "O filtro 'TarefaFeito' deve ser 'true' ou 'false'." }).optional(),
    DataInicio: z
      .string()
      .optional()
      .refine((v) => v === undefined || !isNaN(new Date(v).getTime()), { message: "O filtro 'DataInicio' deve ser uma data válida (ISO 8601)." }),
    DataFim: z
      .string()
      .optional()
      .refine((v) => v === undefined || !isNaN(new Date(v).getTime()), { message: "O filtro 'DataFim' deve ser uma data válida (ISO 8601)." }),
  })
  .superRefine((data, ctx) => {
    if (data.DataInicio && data.DataFim) {
      if (new Date(data.DataInicio) > new Date(data.DataFim)) {
        ctx.addIssue({ code: "custom", message: "O filtro 'DataInicio' deve ser anterior a 'DataFim'." });
      }
    }
  });

// ========== Questão de tarefa "lista" ==========

const AlternativaSchema = z.object({
  AlternativaTexto: z.string().trim().min(1, "AlternativaTexto é obrigatório."),
  AlternativaCorreta: z.boolean({ message: "AlternativaCorreta é obrigatório e deve ser booleano." }),
  AlternativaPontos: z.coerce.number().min(0, "AlternativaPontos é obrigatório e deve ser um número >= 0."),
});

const QuestaoBaseSchema = z.object({
  QuestaoEnunciado: z.string().trim().min(1, "QuestaoEnunciado é obrigatório."),
  QuestaoTipo: z.enum(QUESTAO_TIPO_VALID, { message: "QuestaoTipo deve ser 'objetiva' ou 'discursiva'." }),
  QuestaoPontosMaximos: z.coerce.number().positive("QuestaoPontosMaximos é obrigatório e deve ser um número > 0."),
  QuestaoExplicacao: z.string().optional().nullable(),
  Alternativas: z.array(AlternativaSchema).optional(),
  AnexosGUID: z.array(guid("AnexosGUID")).optional(),
});

function refinarQuestao(questao: z.infer<typeof QuestaoBaseSchema>, ctx: z.RefinementCtx, prefixo: string) {
  if (questao.QuestaoTipo !== "objetiva") return;

  if (!questao.Alternativas || questao.Alternativas.length < 2) {
    ctx.addIssue({ code: "custom", message: `${prefixo}.Alternativas deve ser um array com ao menos 2 itens para questão objetiva.` });
    return;
  }

  const corretas = questao.Alternativas.filter((a) => a.AlternativaCorreta).length;
  if (corretas !== 1) {
    ctx.addIssue({ code: "custom", message: `${prefixo}.Alternativas: exatamente uma alternativa deve ser marcada como correta.` });
  }
}

export const QuestaoCreateBodySchema = z.object({ questao: QuestaoBaseSchema }).superRefine((data, ctx) => refinarQuestao(data.questao, ctx, "questao"));

export const QuestoesBatchBodySchema = z
  .object({ questoes: z.array(QuestaoBaseSchema).min(1, "O campo 'questoes' é obrigatório e deve ser um array com ao menos 1 item.") })
  .superRefine((data, ctx) => data.questoes.forEach((q, i) => refinarQuestao(q, ctx, `questoes[${i}]`)));

const ImportarLinhaSchema = QuestaoBaseSchema.extend({
  LinhaOriginal: z.coerce.number({ message: "LinhaOriginal é obrigatório." }),
});

export const ImportarQuestoesBodySchema = z
  .object({ linhas: z.array(ImportarLinhaSchema).min(1, "O campo 'linhas' é obrigatório e deve ser um array com ao menos 1 item.") })
  .superRefine((data, ctx) => data.linhas.forEach((l, i) => refinarQuestao(l, ctx, `linhas[${i}]`)));

export const QuestaoUpdateBodySchema = z
  .object({
    questao: QuestaoBaseSchema.partial().refine((obj) => Object.values(obj).some((v) => v !== undefined), {
      message: "É necessário fornecer ao menos um campo para atualização: QuestaoEnunciado, QuestaoTipo, QuestaoPontosMaximos, QuestaoExplicacao, Alternativas",
    }),
  })
  .superRefine((data, ctx) => {
    const alternativas = data.questao.Alternativas;
    if (alternativas === undefined) return;

    if (alternativas.length < 2) {
      ctx.addIssue({ code: "custom", message: "questao.Alternativas deve ser um array com ao menos 2 itens." });
      return;
    }

    const corretas = alternativas.filter((a) => a.AlternativaCorreta).length;
    if (corretas !== 1) {
      ctx.addIssue({ code: "custom", message: "questao.Alternativas: exatamente uma alternativa deve ser marcada como correta." });
    }
  });

export const ReordenarQuestoesBodySchema = z.object({
  ordens: z
    .array(
      z.object({
        QuestaoGUID: guid("QuestaoGUID"),
        QuestaoOrdem: z.coerce.number().min(0, "Cada item de 'ordens' precisa de um 'QuestaoOrdem' >= 0."),
      })
    )
    .min(1, "O campo 'ordens' é obrigatório e deve ser um array com ao menos 1 item."),
});

export const AnexoQuestaoBodySchema = z.object({
  AnexoGUID: guid("AnexoGUID"),
});

export const ResponderObjetivaBodySchema = z.object({
  AlternativaGUID: guid("AlternativaGUID"),
});

export const ResponderDiscursivaBodySchema = z.object({
  Texto: z
    .string()
    .trim()
    .min(1, "O campo 'Texto' é obrigatório e não pode ser vazio.")
    .max(8000, "O campo 'Texto' deve ter no máximo 8000 caracteres."),
});

export const AvaliarQuestaoBodySchema = z.object({
  Pontos: z.coerce.number().min(0, "O campo 'Pontos' é obrigatório e deve ser um número >= 0."),
});
