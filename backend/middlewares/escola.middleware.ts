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
      "EscolaCNPJ",
      "EscolaTelefone",
      "EscolaEmail",
      "EscolaEndereco",
      "EscolaCorPriEs",
      "EscolaCorPriCl",
      "EscolaCorSecEs",
      "EscolaCorSecCl",
      "EscolaIcone",
      "EscolaStatus",
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
      if (escola[campo] !== undefined && escola[campo] !== null) {
        if (typeof escola[campo] !== "string") {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `O campo '${campo}' deve ser string.`,
          });
        }

        const valor = escola[campo] as string;

        if (campo === "EscolaCNPJ") {
          const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
          if (!cnpjRegex.test(valor) || valor.length !== 18) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
              message: "O campo 'EscolaCNPJ' deve estar no formato XX.XXX.XXX/XXXX-XX.",
            });
          }
        }

        if (campo === "EscolaTelefone") {
          const telefoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
          if (!telefoneRegex.test(valor) || valor.length !== 15) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
              message: "O campo 'EscolaTelefone' deve estar no formato (XX) XXXXX-XXXX.",
            });
          }
        }

        if (campo === "EscolaEmail") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(valor) || valor.length > 60) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
              message: "O campo 'EscolaEmail' deve ser um email válido com no máximo 60 caracteres.",
            });
          }
        }

        if (campo === "EscolaEndereco" && valor.length > 200) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "O campo 'EscolaEndereco' deve ter no máximo 200 caracteres.",
          });
        }

        if (campo === "EscolaStatus") {
          const statusValidos = ["Ativa", "Inativa"];
          if (!statusValidos.includes(valor)) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
              message: "O campo 'EscolaStatus' deve ser 'Ativa' ou 'Inativa'.",
            });
          }
        }
      }
    }
  }
}