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
    const camposPossiveis = ["UsuarioCPF", "EscolaGUID", "FuncaoId", "DataInicio", "DataFim", "Status"];

    if (!allowOptional) {
      const camposObrigatorios = ["UsuarioCPF", "EscolaGUID", "FuncaoId"];
      for (const campo of camposObrigatorios) {
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
            "Envie ao menos um campo para atualizar: UsuarioCPF, EscolaGUID, FuncaoId, DataInicio, DataFim ou Status.",
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

    if (payload.DataInicio !== undefined && payload.DataInicio !== null) {
      if (typeof payload.DataInicio !== "string") {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'DataInicio' deve ser string no formato YYYY-MM-DD.",
        });
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(payload.DataInicio)) {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'DataInicio' deve estar no formato YYYY-MM-DD.",
        });
      }
    }

    if (payload.DataFim !== undefined && payload.DataFim !== null) {
      if (typeof payload.DataFim !== "string") {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'DataFim' deve ser string no formato YYYY-MM-DD.",
        });
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(payload.DataFim)) {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'DataFim' deve estar no formato YYYY-MM-DD.",
        });
      }
    }

    if (payload.Status !== undefined && payload.Status !== null) {
      if (typeof payload.Status !== "string") {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'Status' deve ser string.",
        });
      }

      const statusValidos = ["Ativo", "Inativo", "Finalizado"];
      if (!statusValidos.includes(payload.Status)) {
        throw new ErrorResponse(400, "Erro na validacao de dados", {
          message: "O campo 'Status' deve ser 'Ativo', 'Inativo' ou 'Finalizado'.",
        });
      }
    }
  }
}
