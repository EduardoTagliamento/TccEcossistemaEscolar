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
