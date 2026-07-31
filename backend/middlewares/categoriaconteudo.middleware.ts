import {
  CategoriaGUIDParamSchema,
  CriarCategoriaBodySchema,
  AtualizarCategoriaBodySchema,
  ReordenarCategoriasBodySchema,
  ReordenarItensBodySchema,
  CriarCategoriaGeralBodySchema,
  ReordenarCategoriasGeraisBodySchema,
  AtualizarCategoriaGeralBodySchema,
  ExcluirCategoriaGeralQuerySchema,
  ResolverCategoriaPorNomeBodySchema,
  MoverItemBoardGeralBodySchema,
  mensagemTopoCategoriaConteudo,
} from "../schemas/categoriaconteudo.schema";
import { zodValidate } from "../utils/zodValidate";

export class CategoriaConteudoMiddleware {
  static validarCriacao = zodValidate(CriarCategoriaBodySchema, "body", mensagemTopoCategoriaConteudo);

  static validarAtualizacao = zodValidate(AtualizarCategoriaBodySchema, "body", mensagemTopoCategoriaConteudo);

  static validarReordenar = zodValidate(ReordenarCategoriasBodySchema, "body", mensagemTopoCategoriaConteudo);

  static validarCriarCategoriaGeral = zodValidate(CriarCategoriaGeralBodySchema, "body", mensagemTopoCategoriaConteudo);

  static validarReordenarCategoriasGerais = zodValidate(ReordenarCategoriasGeraisBodySchema, "body", mensagemTopoCategoriaConteudo);

  static validarAtualizarCategoriaGeral = zodValidate(AtualizarCategoriaGeralBodySchema, "body", mensagemTopoCategoriaConteudo);

  static validarExcluirCategoriaGeral = zodValidate(ExcluirCategoriaGeralQuerySchema, "query", mensagemTopoCategoriaConteudo);

  static validarResolverCategoriaPorNome = zodValidate(ResolverCategoriaPorNomeBodySchema, "body", mensagemTopoCategoriaConteudo);

  static validarMoverItemBoardGeral = zodValidate(MoverItemBoardGeralBodySchema, "body", mensagemTopoCategoriaConteudo);

  static validarReordenarItens = zodValidate(ReordenarItensBodySchema, "body", mensagemTopoCategoriaConteudo);

  static validarGUID = zodValidate(CategoriaGUIDParamSchema, "params", mensagemTopoCategoriaConteudo);
}
