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
  MateriaGUID: "MateriaGUID inválido",
  ConteudoTitulo: "ConteudoTitulo inválido",
  ConteudoTipo: "ConteudoTipo inválido",
  TurmasGUID: "TurmasGUID inválido",
  ConteudoDataPublicacao: "ConteudoDataPublicacao inválida",
  OrigemTipo: "OrigemTipo inválido",
  ConteudoHtml: "ConteudoHtml obrigatório",
  guid: "GUID inválido",
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
    MateriaGUID: z.string().regex(CONTEUDO_GUID_REGEX, "MateriaGUID é obrigatório e deve ser um UUID válido"),
    ConteudoTitulo: z.string().trim().min(2, "ConteudoTitulo é obrigatório (mínimo 2 caracteres)"),
    ConteudoTipo: z.enum(TIPOS_VALIDOS, { message: `ConteudoTipo deve ser um dos: ${TIPOS_VALIDOS.join(", ")}` }),
    TurmasGUID: z.string().min(1, "TurmasGUID é obrigatório (array JSON de UUIDs)"),
    ConteudoDataPublicacao: z
      .string()
      .min(1, "ConteudoDataPublicacao é obrigatória e deve ser uma data válida")
      .refine((v) => !isNaN(new Date(v).getTime()), "ConteudoDataPublicacao é obrigatória e deve ser uma data válida"),
    OrigemTipo: z.string().optional(),
    ConteudoHtml: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ConteudoTipo === "cronometrado" && data.OrigemTipo !== "upload" && data.OrigemTipo !== "link") {
      ctx.addIssue({ code: "custom", path: ["OrigemTipo"], message: "OrigemTipo deve ser 'upload' ou 'link' para conteúdo cronometrado" });
    }
    if (data.ConteudoTipo === "texto" && (!data.ConteudoHtml || !data.ConteudoHtml.trim())) {
      ctx.addIssue({ code: "custom", path: ["ConteudoHtml"], message: "ConteudoHtml é obrigatório para conteúdo de texto" });
    }
  });
