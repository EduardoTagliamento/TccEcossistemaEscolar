import { z } from "zod";

// Regex estrita (UUID v4), igual ao middleware original de categoriaconteudo.
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TIPOS_ITEM_VALIDOS = new Set([
  "prova",
  "tarefa_digital",
  "tarefa_presencial",
  "tarefa_lista",
  "conteudo_video",
  "conteudo_texto",
  "conteudo_imagem",
]);
const TIPOS_ITEM_ENUM = [
  "prova",
  "tarefa_digital",
  "tarefa_presencial",
  "tarefa_lista",
  "conteudo_video",
  "conteudo_texto",
  "conteudo_imagem",
] as const;

/**
 * Mensagem de topo específica por campo, igual ao padrão de `conteudo`
 * (ver backend/schemas/conteudo.schema.ts) — mapeada pelo ÚLTIMO segmento do
 * `path` do issue Zod (necessário aqui porque `validarCriacao`/
 * `validarAtualizacao` validam um body aninhado `{ categoria: {...} }`).
 */
const MENSAGENS_TOPO: Record<string, string> = {
  categoria: "Dados inválidos",
  MateriaGUID: "MateriaGUID inválido",
  TurmaGUID: "TurmaGUID inválido",
  CategoriaNome: "CategoriaNome inválido",
  ordem: "Ordem inválida",
  CategoriaNomeAtual: "CategoriaNomeAtual inválido",
  NovoNome: "NovoNome inválido",
  ItemGUID: "ItemGUID inválido",
  Tipo: "Tipo inválido",
  TurmasGUID: "TurmasGUID inválido",
  CategoriaGUID: "CategoriaGUID inválido",
  itens: "Itens inválidos",
  guid: "GUID inválido",
};

export function mensagemTopoCategoriaConteudo(campo: string | undefined): string {
  return (campo && MENSAGENS_TOPO[campo]) || "Erro na validação de dados";
}

const guidCampo = (campo: string, mensagem?: string) => {
  const msg = mensagem ?? `${campo} é obrigatório e deve ser um UUID válido`;
  return z.string({ message: msg }).regex(GUID_REGEX, msg);
};

const nomeCategoriaCampo = (mensagemObrigatorio: string, mensagemTamanho: string) =>
  z.string({ message: mensagemObrigatorio }).trim().min(2, mensagemTamanho).max(100, mensagemTamanho);

export const CategoriaGUIDParamSchema = z.object({
  guid: z.string({ message: "O parâmetro GUID deve ser um UUID válido" }).regex(GUID_REGEX, "O parâmetro GUID deve ser um UUID válido"),
});

export const CriarCategoriaBodySchema = z.object({
  categoria: z.object(
    {
      MateriaGUID: guidCampo("MateriaGUID"),
      TurmaGUID: guidCampo("TurmaGUID"),
      CategoriaNome: nomeCategoriaCampo("CategoriaNome é obrigatório", "CategoriaNome deve ter entre 2 e 100 caracteres"),
    },
    { message: "O campo 'categoria' é obrigatório" }
  ),
});

// `validarAtualizacao` original só olha `categoria?.CategoriaNome` — se `categoria`
// inteiro faltar, cai no mesmo branch de "CategoriaNome inválido"/"obrigatório"
// (não tem o checkpoint explícito de objeto que `validarCriacao` tem).
export const AtualizarCategoriaBodySchema = z.object({
  categoria: z.object(
    {
      CategoriaNome: nomeCategoriaCampo("CategoriaNome é obrigatório", "CategoriaNome deve ter entre 2 e 100 caracteres"),
    },
    { message: "CategoriaNome é obrigatório" }
  ),
});

export const ReordenarCategoriasBodySchema = z.object({
  MateriaGUID: guidCampo("MateriaGUID"),
  TurmaGUID: guidCampo("TurmaGUID"),
  ordem: z
    .unknown()
    .refine(
      (v) => Array.isArray(v) && v.length > 0 && v.every((g) => typeof g === "string" && GUID_REGEX.test(g)),
      "O campo 'ordem' deve ser uma lista não vazia de UUIDs de categoria"
    ),
});

export const ReordenarItensBodySchema = z.object({
  MateriaGUID: guidCampo("MateriaGUID"),
  TurmaGUID: guidCampo("TurmaGUID"),
  CategoriaGUID: guidCampo("CategoriaGUID", "CategoriaGUID (destino) é obrigatório e deve ser um UUID válido"),
  itens: z
    .unknown()
    .refine(
      (v) =>
        Array.isArray(v) &&
        v.every(
          (item: any) =>
            item &&
            typeof item.ItemGUID === "string" &&
            GUID_REGEX.test(item.ItemGUID) &&
            typeof item.Tipo === "string" &&
            TIPOS_ITEM_VALIDOS.has(item.Tipo)
        ),
      "O campo 'itens' deve ser uma lista de { ItemGUID, Tipo }, com Tipo em um dos tipos válidos"
    ),
});

export const CriarCategoriaGeralBodySchema = z.object({
  MateriaGUID: guidCampo("MateriaGUID"),
  CategoriaNome: nomeCategoriaCampo("CategoriaNome deve ter entre 2 e 100 caracteres", "CategoriaNome deve ter entre 2 e 100 caracteres"),
});

export const ReordenarCategoriasGeraisBodySchema = z.object({
  MateriaGUID: guidCampo("MateriaGUID"),
  ordem: z
    .unknown()
    .refine(
      (v) => Array.isArray(v) && v.every((nome) => typeof nome === "string" && nome.trim().length > 0),
      "O campo 'ordem' deve ser uma lista de nomes de categoria"
    ),
});

export const AtualizarCategoriaGeralBodySchema = z.object({
  MateriaGUID: guidCampo("MateriaGUID"),
  CategoriaNomeAtual: z.string({ message: "CategoriaNomeAtual é obrigatório" }).trim().min(1, "CategoriaNomeAtual é obrigatório"),
  NovoNome: nomeCategoriaCampo("NovoNome deve ter entre 2 e 100 caracteres", "NovoNome deve ter entre 2 e 100 caracteres"),
});

export const ExcluirCategoriaGeralQuerySchema = z.object({
  MateriaGUID: guidCampo("MateriaGUID", "MateriaGUID é obrigatório (query) e deve ser um UUID válido"),
  CategoriaNome: z.string({ message: "CategoriaNome é obrigatório (query)" }).trim().min(1, "CategoriaNome é obrigatório (query)"),
});

export const ResolverCategoriaPorNomeBodySchema = z.object({
  MateriaGUID: guidCampo("MateriaGUID"),
  TurmasGUID: z
    .unknown()
    .refine(
      (v) => Array.isArray(v) && v.length > 0 && v.every((g) => typeof g === "string" && GUID_REGEX.test(g)),
      "O campo 'TurmasGUID' deve ser uma lista não vazia de UUIDs de turma"
    ),
  CategoriaNome: nomeCategoriaCampo("CategoriaNome deve ter entre 2 e 100 caracteres", "CategoriaNome deve ter entre 2 e 100 caracteres"),
});

export const MoverItemBoardGeralBodySchema = z.object({
  MateriaGUID: guidCampo("MateriaGUID"),
  TurmaGUID: guidCampo("TurmaGUID"),
  ItemGUID: guidCampo("ItemGUID"),
  Tipo: z.enum(TIPOS_ITEM_ENUM, { message: "Tipo de item inválido" }),
  CategoriaNome: z
    .unknown()
    .refine((v) => v === undefined || v === null || typeof v === "string", "CategoriaNome deve ser string ou null")
    .optional(),
});
