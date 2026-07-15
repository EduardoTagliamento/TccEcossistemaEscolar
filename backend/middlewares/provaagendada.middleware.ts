import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_VALID = ["Agendada", "Realizada", "Cancelada"];

/**
 * Middleware de validação para rotas de ProvaAgendada (REFATORADO - N:N NORMALIZADO)
 */
export default class ProvaAgendadaMiddleware {
  /**
   * Valida o GUID da prova nos parâmetros da rota
   */
  validateIdParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 ProvaAgendadaMiddleware.validateIdParam()");
    const { ProvaAgendadaGUID } = request.params;

    if (!ProvaAgendadaGUID) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'ProvaAgendadaGUID' é obrigatório!",
      });
    }

    if (!GUID_REGEX.test(ProvaAgendadaGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'ProvaAgendadaGUID' deve ser um UUID válido.",
      });
    }

    next();
  };

  /**
   * Valida body para criação de prova (POST)
   *
   * Body: { prova: { TurmasGUID[], MateriaGUID, ProvaData, ProvaDescricao?, anexosDescricao? } }
   */
  validateCreateBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 ProvaAgendadaMiddleware.validateCreateBody()");
    const { prova } = request.body;

    if (!prova || typeof prova !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'prova' é obrigatório e deve ser um objeto.",
      });
    }

    // Validação do array de turmas
    if (!prova.TurmasGUID || !Array.isArray(prova.TurmasGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TurmasGUID' é obrigatório e deve ser um array.",
      });
    }

    if (prova.TurmasGUID.length === 0) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "É necessário selecionar pelo menos uma turma.",
      });
    }

    for (const turmaGUID of prova.TurmasGUID) {
      if (typeof turmaGUID !== "string" || !GUID_REGEX.test(turmaGUID)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: `O valor '${turmaGUID}' em 'TurmasGUID' não é um UUID válido.`,
        });
      }
    }

    if (!prova.MateriaGUID || typeof prova.MateriaGUID !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'MateriaGUID' é obrigatório.",
      });
    }

    if (!GUID_REGEX.test(prova.MateriaGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'MateriaGUID' deve ser um UUID válido.",
      });
    }

    if (!prova.ProvaData) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'ProvaData' é obrigatório.",
      });
    }

    const provaData = new Date(prova.ProvaData);
    if (isNaN(provaData.getTime())) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'ProvaData' deve ser uma data válida (ISO 8601).",
      });
    }

    if (prova.ProvaDescricao !== undefined && prova.ProvaDescricao !== null) {
      if (typeof prova.ProvaDescricao !== "string") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'ProvaDescricao' deve ser uma string.",
        });
      }
      if (prova.ProvaDescricao.trim().length > 1024) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'ProvaDescricao' deve ter no máximo 1024 caracteres.",
        });
      }
    }

    if (prova.DatasPorTurma !== undefined) {
      if (typeof prova.DatasPorTurma !== "object" || Array.isArray(prova.DatasPorTurma)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'DatasPorTurma' deve ser um objeto { TurmaGUID: data }.",
        });
      }

      for (const [turmaGUID, dataTurma] of Object.entries(prova.DatasPorTurma)) {
        if (!GUID_REGEX.test(turmaGUID)) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `A chave '${turmaGUID}' em 'DatasPorTurma' não é um UUID de turma válido.`,
          });
        }
        if (!prova.TurmasGUID.includes(turmaGUID)) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `A turma '${turmaGUID}' em 'DatasPorTurma' não está em 'TurmasGUID'.`,
          });
        }
        if (isNaN(new Date(dataTurma as string).getTime())) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `A data para a turma '${turmaGUID}' em 'DatasPorTurma' é inválida.`,
          });
        }
      }
    }

    if (prova.anexosDescricao !== undefined) {
      if (!Array.isArray(prova.anexosDescricao)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'anexosDescricao' deve ser um array de UUIDs.",
        });
      }

      for (const guid of prova.anexosDescricao) {
        if (typeof guid !== "string" || !GUID_REGEX.test(guid)) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `O valor '${guid}' em 'anexosDescricao' não é um UUID válido.`,
          });
        }
      }
    }

    next();
  };

  /**
   * Valida body para atualização de prova (PUT)
   */
  validateUpdateBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 ProvaAgendadaMiddleware.validateUpdateBody()");
    const { prova } = request.body;

    if (!prova || typeof prova !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'prova' é obrigatório e deve ser um objeto.",
      });
    }

    const camposValidos = ["ProvaData", "ProvaDescricao", "ProvaStatus"];
    const camposFornecidos = camposValidos.filter((c) => prova[c] !== undefined);

    if (camposFornecidos.length === 0) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message:
          "É necessário fornecer ao menos um campo para atualização: " +
          camposValidos.join(", "),
      });
    }

    if (prova.ProvaData !== undefined) {
      const provaData = new Date(prova.ProvaData);
      if (isNaN(provaData.getTime())) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'ProvaData' deve ser uma data válida (ISO 8601).",
        });
      }
    }

    if (prova.ProvaDescricao !== undefined && prova.ProvaDescricao !== null) {
      if (typeof prova.ProvaDescricao !== "string") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'ProvaDescricao' deve ser uma string.",
        });
      }
      if (prova.ProvaDescricao.trim().length > 1024) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'ProvaDescricao' deve ter no máximo 1024 caracteres.",
        });
      }
    }

    if (prova.ProvaStatus !== undefined && !STATUS_VALID.includes(prova.ProvaStatus)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'ProvaStatus' deve ser 'Agendada', 'Realizada' ou 'Cancelada'.",
      });
    }

    next();
  };

  /**
   * Valida query params para busca/listagem (sem TurmaGUID - agora via join)
   */
  validateFilters = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 ProvaAgendadaMiddleware.validateFilters()");
    const { MateriaGUID, ProvaStatus, DataInicio, DataFim } = request.query;

    if (MateriaGUID !== undefined) {
      if (typeof MateriaGUID !== "string" || !GUID_REGEX.test(MateriaGUID)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'MateriaGUID' deve ser um UUID válido.",
        });
      }
    }

    if (ProvaStatus !== undefined) {
      if (typeof ProvaStatus !== "string" || !STATUS_VALID.includes(ProvaStatus)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'ProvaStatus' deve ser 'Agendada', 'Realizada' ou 'Cancelada'.",
        });
      }
    }

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
