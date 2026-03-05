import { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/ErrorResponse.js";

export default class EscolaxUsuarioxFuncaoMiddleware {
  validateCreateBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("Middleware: EscolaxUsuarioxFuncao.validateCreateBody()");
    const body = request.body;

    if (!body.escolaxusuarioxfuncao) {
      throw new ErrorResponse(400, "Erro na validacao de dados", {
        message: "O campo 'escolaxusuarioxfuncao' e obrigatorio!",
      });
    }

    this.validateCampos(body.escolaxusuarioxfuncao, false);
    next();
  };

  validateUpdateBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("Middleware: EscolaxUsuarioxFuncao.validateUpdateBody()");
    const body = request.body;

    if (!body.escolaxusuarioxfuncao) {
      throw new ErrorResponse(400, "Erro na validacao de dados", {
        message: "O campo 'escolaxusuarioxfuncao' e obrigatorio!",
      });
    }

    this.validateCampos(body.escolaxusuarioxfuncao, true);
    next();
  };

  validateIdParam = (request: Request, _response: Response, next: NextFunction) => {
    console.log("Middleware: EscolaxUsuarioxFuncao.validateIdParam()");
    const { EscolaxUsuarioxFuncaoId } = request.params;

    if (!EscolaxUsuarioxFuncaoId) {
      throw new ErrorResponse(400, "Erro na validacao de dados", {
        message: "O parametro 'EscolaxUsuarioxFuncaoId' e obrigatorio!",
      });
    }

    const id = Number(EscolaxUsuarioxFuncaoId);
    if (!Number.isInteger(id) || id < 1) {
      throw new ErrorResponse(400, "Erro na validacao de dados", {
        message: "O parametro 'EscolaxUsuarioxFuncaoId' deve ser um inteiro positivo.",
      });
    }

    next();
  };

  private validateCampos(
    payload: Record<string, unknown>,
    allowOptional = false
  ): void {
    const camposPossiveis = ["UsuarioCPF", "EscolaGUID", "FuncaoId"];

    if (!allowOptional) {
      for (const campo of camposPossiveis) {
        const valor = payload[campo];
        if (valor === undefined || valor === null || valor === "") {
          throw new ErrorResponse(400, "Erro na validacao de dados", {
            message: `O campo '${campo}' e obrigatorio!`,
          });
        }
      }
    }

    if (allowOptional) {
      const hasAtLeastOneField = camposPossiveis.some(
        (campo) => payload[campo] !== undefined
      );

      if (!hasAtLeastOneField) {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message:
            "Envie ao menos um campo para atualizar: UsuarioCPF, EscolaGUID ou FuncaoId.",
        });
      }
    }

    if (payload.UsuarioCPF !== undefined && payload.UsuarioCPF !== null) {
      if (typeof payload.UsuarioCPF !== "string") {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'UsuarioCPF' deve ser string.",
        });
      }

      const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
      if (!cpfRegex.test(payload.UsuarioCPF)) {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'UsuarioCPF' deve estar no formato XXX.XXX.XXX-XX.",
        });
      }
    }

    if (payload.EscolaGUID !== undefined && payload.EscolaGUID !== null) {
      if (typeof payload.EscolaGUID !== "string") {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'EscolaGUID' deve ser string.",
        });
      }

      const guidRegex =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      if (!guidRegex.test(payload.EscolaGUID)) {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'EscolaGUID' deve ser um UUID valido.",
        });
      }
    }

    if (payload.FuncaoId !== undefined && payload.FuncaoId !== null) {
      const funcaoId = Number(payload.FuncaoId);

      if (!Number.isInteger(funcaoId) || funcaoId < 1) {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'FuncaoId' deve ser um inteiro positivo.",
        });
      }
    }
  }
}
