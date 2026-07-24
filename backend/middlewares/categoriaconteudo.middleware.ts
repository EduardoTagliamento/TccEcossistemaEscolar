import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CategoriaConteudoMiddleware {
  static validarCriacao = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 CategoriaConteudoMiddleware.validarCriacao()");

    const { categoria } = req.body;

    if (!categoria || typeof categoria !== "object") {
      return next(
        new ErrorResponse(400, "Dados inválidos", { message: "O campo 'categoria' é obrigatório" })
      );
    }

    if (!categoria.MateriaGUID || !uuidRegex.test(categoria.MateriaGUID)) {
      return next(
        new ErrorResponse(400, "MateriaGUID inválido", {
          message: "MateriaGUID é obrigatório e deve ser um UUID válido",
        })
      );
    }

    if (!categoria.TurmaGUID || !uuidRegex.test(categoria.TurmaGUID)) {
      return next(
        new ErrorResponse(400, "TurmaGUID inválido", {
          message: "TurmaGUID é obrigatório e deve ser um UUID válido",
        })
      );
    }

    if (!categoria.CategoriaNome || typeof categoria.CategoriaNome !== "string") {
      return next(
        new ErrorResponse(400, "CategoriaNome inválido", {
          message: "CategoriaNome é obrigatório",
        })
      );
    }

    const nome = categoria.CategoriaNome.trim();
    if (nome.length < 2 || nome.length > 100) {
      return next(
        new ErrorResponse(400, "CategoriaNome inválido", {
          message: "CategoriaNome deve ter entre 2 e 100 caracteres",
        })
      );
    }

    next();
  };

  static validarAtualizacao = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 CategoriaConteudoMiddleware.validarAtualizacao()");

    const { categoria } = req.body;

    if (!categoria?.CategoriaNome || typeof categoria.CategoriaNome !== "string") {
      return next(
        new ErrorResponse(400, "CategoriaNome inválido", {
          message: "CategoriaNome é obrigatório",
        })
      );
    }

    const nome = categoria.CategoriaNome.trim();
    if (nome.length < 2 || nome.length > 100) {
      return next(
        new ErrorResponse(400, "CategoriaNome inválido", {
          message: "CategoriaNome deve ter entre 2 e 100 caracteres",
        })
      );
    }

    next();
  };

  static validarReordenar = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 CategoriaConteudoMiddleware.validarReordenar()");

    const { MateriaGUID, TurmaGUID, ordem } = req.body;

    if (!MateriaGUID || !uuidRegex.test(MateriaGUID)) {
      return next(
        new ErrorResponse(400, "MateriaGUID inválido", { message: "MateriaGUID é obrigatório e deve ser um UUID válido" })
      );
    }

    if (!TurmaGUID || !uuidRegex.test(TurmaGUID)) {
      return next(
        new ErrorResponse(400, "TurmaGUID inválido", { message: "TurmaGUID é obrigatório e deve ser um UUID válido" })
      );
    }

    if (!Array.isArray(ordem) || ordem.length === 0 || !ordem.every((guid) => typeof guid === "string" && uuidRegex.test(guid))) {
      return next(
        new ErrorResponse(400, "Ordem inválida", {
          message: "O campo 'ordem' deve ser uma lista não vazia de UUIDs de categoria",
        })
      );
    }

    next();
  };

  static validarReordenarItens = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 CategoriaConteudoMiddleware.validarReordenarItens()");

    const { MateriaGUID, TurmaGUID, CategoriaGUID, itens } = req.body;
    const tiposValidos = new Set([
      "prova",
      "tarefa_digital",
      "tarefa_presencial",
      "conteudo_video",
      "conteudo_texto",
      "conteudo_imagem",
    ]);

    if (!MateriaGUID || !uuidRegex.test(MateriaGUID)) {
      return next(
        new ErrorResponse(400, "MateriaGUID inválido", { message: "MateriaGUID é obrigatório e deve ser um UUID válido" })
      );
    }

    if (!TurmaGUID || !uuidRegex.test(TurmaGUID)) {
      return next(
        new ErrorResponse(400, "TurmaGUID inválido", { message: "TurmaGUID é obrigatório e deve ser um UUID válido" })
      );
    }

    if (!CategoriaGUID || !uuidRegex.test(CategoriaGUID)) {
      return next(
        new ErrorResponse(400, "CategoriaGUID inválido", {
          message: "CategoriaGUID (destino) é obrigatório e deve ser um UUID válido",
        })
      );
    }

    if (
      !Array.isArray(itens) ||
      !itens.every(
        (item) =>
          item &&
          typeof item.ItemGUID === "string" &&
          uuidRegex.test(item.ItemGUID) &&
          typeof item.Tipo === "string" &&
          tiposValidos.has(item.Tipo)
      )
    ) {
      return next(
        new ErrorResponse(400, "Itens inválidos", {
          message: "O campo 'itens' deve ser uma lista de { ItemGUID, Tipo }, com Tipo em um dos tipos válidos",
        })
      );
    }

    next();
  };

  static validarGUID = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 CategoriaConteudoMiddleware.validarGUID()");

    const { guid } = req.params;

    if (!guid || !uuidRegex.test(guid)) {
      return next(
        new ErrorResponse(400, "GUID inválido", {
          message: "O parâmetro GUID deve ser um UUID válido",
        })
      );
    }

    next();
  };
}
