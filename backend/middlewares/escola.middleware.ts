import { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/ErrorResponse.js";

export default class EscolaMiddleware {
  validateCreateBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 EscolaMiddleware.validateCreateBody()");
    const escola = this.extractEscolaPayload(request.body);
    this.normalizeEscolaCampos(escola);
    this.validateCampos(escola);

    // Mantem compatibilidade com controller/service atuais.
    request.body.escola = escola;
    next();
  };

  validateUpdateBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 EscolaMiddleware.validateUpdateBody()");
    const escola = this.extractEscolaPayload(request.body);
    this.normalizeEscolaCampos(escola);
    this.validateCampos(escola, true);

    // Mantem compatibilidade com controller/service atuais.
    request.body.escola = escola;
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

  private extractEscolaPayload(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "Corpo da requisição inválido.",
      });
    }

    const bodyObj = body as Record<string, unknown>;

    if (bodyObj.escola && typeof bodyObj.escola === "object" && !Array.isArray(bodyObj.escola)) {
      return bodyObj.escola as Record<string, unknown>;
    }

    return bodyObj;
  }

  private normalizeEscolaCampos(escola: Record<string, unknown>): void {
    if (typeof escola.EscolaCNPJ === "string") {
      const digits = escola.EscolaCNPJ.replace(/\D/g, "");
      if (digits.length === 14) {
        escola.EscolaCNPJ = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
      }
    }

    if (typeof escola.EscolaTelefone === "string") {
      const digits = escola.EscolaTelefone.replace(/\D/g, "");
      if (digits.length === 11) {
        escola.EscolaTelefone = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      }
    }
  }
}