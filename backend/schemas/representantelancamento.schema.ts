import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIA_SEMANA_ENUM = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"] as const;

export const TurmaGUIDParamsSchema = z.object({
  turmaGUID: z.string({ message: "Turma inválida" }).regex(GUID_REGEX, "Turma inválida"),
});

export const EscolaGUIDParamsSchema = z.object({
  escolaGUID: z.string({ message: "Escola inválida" }).regex(GUID_REGEX, "Escola inválida"),
});

const modoAgendamentoCampos = {
  ModoAutomatico: z.boolean().optional(),
  SemanaBase: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "SemanaBase deve ser YYYY-MM-DD").optional(),
  DiaSemana: z.enum(DIA_SEMANA_ENUM).optional(),
};

export const CriarProvaRepresentanteBodySchema = z.object({
  MateriaGUID: z.string({ message: "Selecione uma matéria" }).regex(GUID_REGEX, "Matéria inválida"),
  ProvaTitulo: z.string({ message: "Informe o título" }).min(1).max(128),
  ProvaData: z.string({ message: "Informe a data" }),
  ProvaDescricao: z.string().max(1024).optional(),
  MaterialDidaticoCapituloGUID: z.string().regex(GUID_REGEX, "Capítulo inválido").optional(),
  ...modoAgendamentoCampos,
});

export const CriarTarefaRepresentanteBodySchema = z.object({
  MateriaGUID: z.string({ message: "Selecione uma matéria" }).regex(GUID_REGEX, "Matéria inválida"),
  TarefaTitulo: z.string({ message: "Informe o título" }).min(1).max(128),
  TarefaConteudo: z.string().optional(),
  TarefaPrazoData: z.string({ message: "Informe o prazo" }),
  TarefaTipoEntrega: z.enum(["digital", "fisica", "lista"], { message: "Tipo de entrega inválido" }),
  ...modoAgendamentoCampos,
});

/**
 * Só tipo "texto" nesta primeira versão — "cronometrado" (vídeo/link) e
 * "paginado" (arquivos) exigiriam upload multipart, fora do escopo desta
 * entrega inicial (ver docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md).
 */
export const CriarConteudoRepresentanteBodySchema = z.object({
  MateriaGUID: z.string({ message: "Selecione uma matéria" }).regex(GUID_REGEX, "Matéria inválida"),
  ConteudoTitulo: z.string({ message: "Informe o título" }).min(1).max(128),
  ConteudoDescricao: z.string().max(2048).optional(),
  ConteudoDataPublicacao: z.string({ message: "Informe a data de publicação" }),
  ConteudoHtml: z.string({ message: "Informe o conteúdo em texto" }).min(1),
});

export const DefinirFlagRepresentanteBodySchema = z.object({
  PermiteLancamentoPorRepresentante: z.boolean({ message: "Informe true ou false" }),
});
