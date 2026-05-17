import { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * Middleware de validação para anexos.
 * 
 * Valida:
 * - Parâmetros de rota (AnexoGUID)
 * - Body de requisições (EscolaGUID, file)
 * - Filtros de busca
 */
export default class AnexoMiddleware {
  
  /**
   * Valida o GUID do anexo nos parâmetros da rota
   */
  validateIdParam = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 AnexoMiddleware.validateIdParam()");
    const { AnexoGUID } = request.params;

    if (!AnexoGUID) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'AnexoGUID' é obrigatório!",
      });
    }

    // Validar formato UUID
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(AnexoGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'AnexoGUID' deve ser um UUID válido.",
      });
    }

    next();
  };

  /**
   * Valida body para upload de anexo (multipart/form-data)
   */
  validateUploadBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 AnexoMiddleware.validateUploadBody()");
    
    // EscolaGUID vem do body (form-data)
    const { EscolaGUID } = request.body;

    if (!EscolaGUID) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'EscolaGUID' é obrigatório!",
      });
    }

    // Validar formato UUID
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(EscolaGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'EscolaGUID' deve ser um UUID válido.",
      });
    }

    // Validar presença de arquivo (será validado após multer processar)
    if (!request.file) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "Nenhum arquivo foi enviado. O campo 'file' é obrigatório.",
      });
    }

    next();
  };

  /**
   * Valida query params para busca/listagem
   */
  validateFilters = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 AnexoMiddleware.validateFilters()");
    
    const { UsuarioCPF, EscolaGUID, DataInicio, DataFim } = request.query;

    // Validar CPF se fornecido
    if (UsuarioCPF) {
      if (typeof UsuarioCPF !== "string") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'UsuarioCPF' deve ser uma string.",
        });
      }

      const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
      if (!cpfRegex.test(UsuarioCPF)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'UsuarioCPF' deve estar no formato XXX.XXX.XXX-XX.",
        });
      }
    }

    // Validar EscolaGUID se fornecido
    if (EscolaGUID) {
      if (typeof EscolaGUID !== "string") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'EscolaGUID' deve ser uma string.",
        });
      }

      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(EscolaGUID)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'EscolaGUID' deve ser um UUID válido.",
        });
      }
    }

    // Validar datas se fornecidas
    if (DataInicio) {
      const dataInicio = new Date(DataInicio as string);
      if (isNaN(dataInicio.getTime())) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'DataInicio' deve ser uma data válida (ISO 8601).",
        });
      }
    }

    if (DataFim) {
      const dataFim = new Date(DataFim as string);
      if (isNaN(dataFim.getTime())) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'DataFim' deve ser uma data válida (ISO 8601).",
        });
      }
    }

    // Validar que DataInicio < DataFim
    if (DataInicio && DataFim) {
      const inicio = new Date(DataInicio as string);
      const fim = new Date(DataFim as string);
      
      if (inicio > fim) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'DataInicio' deve ser anterior a 'DataFim'.",
        });
      }
    }

    next();
  };
}
