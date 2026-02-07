import { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/ErrorResponse.js";

export default class EscolaMiddleware {
  validateCreateBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 EscolaMiddleware.validateCreateBody()");
    const body = request.body;

    if (!body.escola) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'escola' é obrigatório!",
      });
    }

    this.validateCampos(body.escola);
    next();
  };

  validateUpdateBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 EscolaMiddleware.validateUpdateBody()");
    const body = request.body;

    if (!body.escola) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'escola' é obrigatório!",
      });
    }

    this.validateCampos(body.escola, true);
    next();
  };

  validateIdParam = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 EscolaMiddleware.validateIdParam()");
    const { EscolaGUID } = request.params;

    if (!EscolaGUID) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'EscolaGUID' é obrigatório!",
      });
    }

    next();
  };

  private validateCampos(escola: Record<string, unknown>, allowOptional = false): void {
    const camposPossiveis = [
      "EscolaNome",
      "EscolaCorPriEs",
      "EscolaCorPriCl",
      "EscolaCorSecEs",
      "EscolaCorSecCl",
      "EscolaIcone",
    ];

    const camposObrigatorios = allowOptional ? [] : ["EscolaNome"];

    for (const campo of camposObrigatorios) {
      const valor = escola[campo];
      if (valor === undefined || valor === null || valor === "") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: `O campo '${campo}' é obrigatório!`,
        });
      }
    }

    for (const campo of camposPossiveis) {
      if (escola[campo] !== undefined && escola[campo] !== null && typeof escola[campo] !== "string") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: `O campo '${campo}' deve ser string.`,
        });
      }
    }
  }
}