import { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/ErrorResponse";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPO_AVISO_VALID = ["tarefa", "prova"];
const DIA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default class CalendarioMiddleware {
  validateFilters = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 CalendarioMiddleware.validateFilters()");

    const { EscolaGUID, DataInicio, DataFim, TipoAviso } = request.query;

    if (!EscolaGUID || typeof EscolaGUID !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'EscolaGUID' é obrigatório.",
      });
    }

    if (!GUID_REGEX.test(EscolaGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'EscolaGUID' deve ser um UUID válido.",
      });
    }

    if (DataInicio !== undefined) {
      const dataInicio = new Date(DataInicio as string);
      if (Number.isNaN(dataInicio.getTime())) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'DataInicio' deve ser uma data válida (ISO 8601).",
        });
      }
    }

    if (DataFim !== undefined) {
      const dataFim = new Date(DataFim as string);
      if (Number.isNaN(dataFim.getTime())) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'DataFim' deve ser uma data válida (ISO 8601).",
        });
      }
    }

    if (DataInicio && DataFim) {
      const inicio = new Date(DataInicio as string);
      const fim = new Date(DataFim as string);
      if (inicio > fim) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'DataInicio' deve ser anterior a 'DataFim'.",
        });
      }
    }

    if (TipoAviso !== undefined) {
      if (typeof TipoAviso !== "string" || !TIPO_AVISO_VALID.includes(TipoAviso)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'TipoAviso' deve ser 'tarefa' ou 'prova'.",
        });
      }
    }

    next();
  };

  validateDiaParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 CalendarioMiddleware.validateDiaParam()");
    const { data } = request.params;

    if (!data || !DIA_REGEX.test(data)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'data' deve estar no formato YYYY-MM-DD.",
      });
    }

    next();
  };
}
