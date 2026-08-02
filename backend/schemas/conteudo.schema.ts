import { z } from "zod";

// Regex ESTRITA (UUID v4), diferente da solta usada em tarefaacademica/provaagendada —
// mantém compatibilidade com backend/middlewares/conteudo.middleware.ts (uuidRegex).
export const CONTEUDO_GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIPOS_VALIDOS = ["cronometrado", "texto", "paginado"] as const;

/**
 * Ao contrário de tarefaacademica/provaagendada (sempre "Erro na validação de
 * dados" no topo), conteudo usa uma mensagem de topo específica por campo —
 * ver backend/middlewares/conteudo.middleware.ts original. Mapeado aqui pelo
 * nome do campo (primeiro segmento do `path` do issue Zod).
 */
const MENSAGENS_TOPO: Record<string, string> = {
  MateriaGUID: "Matéria inválida",
  ConteudoTitulo: "Título inválido",
  ConteudoTipo: "Tipo de conteúdo inválido",
  TurmasGUID: "Turmas inválidas",
  ConteudoDataPublicacao: "Data de publicação inválida",
  OrigemTipo: "Origem inválida",
  ConteudoHtml: "Texto do conteúdo obrigatório",
  guid: "Identificador inválido",
};

export function mensagemTopoConteudo(campo: string | undefined): string {
  return (campo && MENSAGENS_TOPO[campo]) || "Erro na validação de dados";
}

export const ConteudoGuidParamSchema = z.object({
  guid: z.string().regex(CONTEUDO_GUID_REGEX, "O parâmetro GUID deve ser um UUID válido"),
});

/**
 * POST /api/conteudo é multipart/form-data (conteudoUploadMiddleware roda
 * antes) — todo campo não-arquivo chega em req.body como STRING (multer).
 * Este schema valida exatamente o que o middleware original validava nesse
 * nível (formato/obrigatoriedade dos campos crus) — o JSON.parse de
 * TurmasGUID/DatasPorTurma/CategoriasPorTurma continua no controller
 * (ConteudoController.store), fora do escopo deste schema.
 */
export const ConteudoCriacaoBodySchema = z
  .object({
    MateriaGUID: z.string().regex(CONTEUDO_GUID_REGEX, "Selecione uma matéria válida"),
    ConteudoTitulo: z.string().trim().min(2, "O título é obrigatório (mínimo 2 caracteres)"),
    ConteudoTipo: z.enum(TIPOS_VALIDOS, { message: `O tipo de conteúdo deve ser um dos: ${TIPOS_VALIDOS.join(", ")}` }),
    TurmasGUID: z.string().min(1, "Selecione ao menos uma turma"),
    ConteudoDataPublicacao: z
      .string()
      .min(1, "Informe a data de publicação")
      .refine((v) => !isNaN(new Date(v).getTime()), "Informe uma data de publicação válida"),
    OrigemTipo: z.string().optional(),
    ConteudoHtml: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ConteudoTipo === "cronometrado" && data.OrigemTipo !== "upload" && data.OrigemTipo !== "link") {
      ctx.addIssue({ code: "custom", path: ["OrigemTipo"], message: "Escolha upload de arquivo ou link para este conteúdo" });
    }
    if (data.ConteudoTipo === "texto" && (!data.ConteudoHtml || !data.ConteudoHtml.trim())) {
      ctx.addIssue({ code: "custom", path: ["ConteudoHtml"], message: "O texto do conteúdo não pode ficar vazio" });
    }
  });
