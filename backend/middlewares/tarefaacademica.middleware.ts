import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPO_ENTREGA_VALID = ["digital", "fisica"];

/**
 * Middleware de validação para rotas de TarefaAcademica
 *
 * Valida:
 * - Parâmetros de rota (TarefaGUID, AnexoGUID)
 * - Body de criação e atualização
 * - Filtros de busca (query params)
 */
export default class TarefaAcademicaMiddleware {
  /**
   * Valida o GUID da tarefa nos parâmetros da rota
   */
  validateIdParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateIdParam()");
    const { TarefaGUID } = request.params;

    if (!TarefaGUID) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'TarefaGUID' é obrigatório!",
      });
    }

    if (!GUID_REGEX.test(TarefaGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'TarefaGUID' deve ser um UUID válido.",
      });
    }

    next();
  };

  /**
   * Valida o GUID da tarefa e do anexo nos parâmetros da rota
   */
  validateIdParamWithAnexo = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateIdParamWithAnexo()");
    const { TarefaGUID, AnexoGUID } = request.params;

    if (!TarefaGUID) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'TarefaGUID' é obrigatório!",
      });
    }

    if (!GUID_REGEX.test(TarefaGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'TarefaGUID' deve ser um UUID válido.",
      });
    }

    if (!AnexoGUID) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'AnexoGUID' é obrigatório!",
      });
    }

    if (!GUID_REGEX.test(AnexoGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'AnexoGUID' deve ser um UUID válido.",
      });
    }

    next();
  };

  /**
   * Valida body para criação de tarefa (POST)
   *
   * Body: { tarefa: { MatriculaGUID, matXprofXturxescGUID, TarefaTitulo, TarefaConteudo?,
   *                   TarefaPrazoData, TarefaTipoEntrega, anexosDescricao? } }
   */
  validateCreateBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateCreateBody()");
    const { tarefa } = request.body;

    if (!tarefa || typeof tarefa !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'tarefa' é obrigatório e deve ser um objeto.",
      });
    }

    // MatriculaGUID: obrigatório, string não vazia
    if (!tarefa.MatriculaGUID || typeof tarefa.MatriculaGUID !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'MatriculaGUID' é obrigatório.",
      });
    }

    const matriculaGUID = tarefa.MatriculaGUID.trim();
    if (matriculaGUID.length < 1 || matriculaGUID.length > 36) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'MatriculaGUID' deve ter entre 1 e 36 caracteres.",
      });
    }

    // matXprofXturxescGUID: obrigatório, UUID
    if (!tarefa.matXprofXturxescGUID || typeof tarefa.matXprofXturxescGUID !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'matXprofXturxescGUID' é obrigatório.",
      });
    }

    if (!GUID_REGEX.test(tarefa.matXprofXturxescGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'matXprofXturxescGUID' deve ser um UUID válido.",
      });
    }

    // TarefaTitulo: obrigatório, 1-128 chars
    if (!tarefa.TarefaTitulo || typeof tarefa.TarefaTitulo !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaTitulo' é obrigatório.",
      });
    }

    const titulo = tarefa.TarefaTitulo.trim();
    if (titulo.length < 1 || titulo.length > 128) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaTitulo' deve ter entre 1 e 128 caracteres.",
      });
    }

    // TarefaConteudo: opcional, máximo 1024 chars
    if (tarefa.TarefaConteudo !== undefined && tarefa.TarefaConteudo !== null) {
      if (typeof tarefa.TarefaConteudo !== "string") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'TarefaConteudo' deve ser uma string.",
        });
      }
      if (tarefa.TarefaConteudo.trim().length > 1024) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'TarefaConteudo' deve ter no máximo 1024 caracteres.",
        });
      }
    }

    // TarefaPrazoData: obrigatório, data válida
    if (!tarefa.TarefaPrazoData) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaPrazoData' é obrigatório.",
      });
    }

    const prazo = new Date(tarefa.TarefaPrazoData);
    if (isNaN(prazo.getTime())) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaPrazoData' deve ser uma data válida (ISO 8601).",
      });
    }

    // TarefaTipoEntrega: obrigatório, enum
    if (!tarefa.TarefaTipoEntrega) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaTipoEntrega' é obrigatório.",
      });
    }

    if (!TIPO_ENTREGA_VALID.includes(tarefa.TarefaTipoEntrega)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaTipoEntrega' deve ser 'digital' ou 'fisica'.",
      });
    }

    // anexosDescricao: opcional, array de UUIDs
    if (tarefa.anexosDescricao !== undefined) {
      if (!Array.isArray(tarefa.anexosDescricao)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'anexosDescricao' deve ser um array de UUIDs.",
        });
      }

      for (const guid of tarefa.anexosDescricao) {
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
   * Valida body para criação de múltiplas tarefas (POST /batch)
   *
   * Body: { tarefa: { MatriculasGUID[], matXprofXturxescGUID, TarefaTitulo, TarefaConteudo?,
   *                   TarefaPrazoData, TarefaTipoEntrega, anexosDescricao? } }
   */
  validateBatchCreateBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateBatchCreateBody()");
    const { tarefa } = request.body;

    if (!tarefa || typeof tarefa !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'tarefa' é obrigatório e deve ser um objeto.",
      });
    }

    // MatriculasGUID: obrigatório, array de strings não vazias
    if (!tarefa.MatriculasGUID || !Array.isArray(tarefa.MatriculasGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'MatriculasGUID' é obrigatório e deve ser um array.",
      });
    }

    if (tarefa.MatriculasGUID.length === 0) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'MatriculasGUID' deve conter ao menos uma matrícula.",
      });
    }

    for (const matriculaGUID of tarefa.MatriculasGUID) {
      if (typeof matriculaGUID !== "string" || matriculaGUID.trim().length < 1 || matriculaGUID.trim().length > 36) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "Cada 'MatriculaGUID' deve ser uma string entre 1 e 36 caracteres.",
        });
      }
    }

    // matXprofXturxescGUID: obrigatório, UUID
    if (!tarefa.matXprofXturxescGUID || typeof tarefa.matXprofXturxescGUID !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'matXprofXturxescGUID' é obrigatório.",
      });
    }

    if (!GUID_REGEX.test(tarefa.matXprofXturxescGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'matXprofXturxescGUID' deve ser um UUID válido.",
      });
    }

    // TarefaTitulo: obrigatório, 1-128 chars
    if (!tarefa.TarefaTitulo || typeof tarefa.TarefaTitulo !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaTitulo' é obrigatório.",
      });
    }

    const titulo = tarefa.TarefaTitulo.trim();
    if (titulo.length < 1 || titulo.length > 128) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaTitulo' deve ter entre 1 e 128 caracteres.",
      });
    }

    // TarefaConteudo: opcional, máximo 1024 chars
    if (tarefa.TarefaConteudo !== undefined && tarefa.TarefaConteudo !== null) {
      if (typeof tarefa.TarefaConteudo !== "string") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'TarefaConteudo' deve ser uma string.",
        });
      }
      if (tarefa.TarefaConteudo.trim().length > 1024) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'TarefaConteudo' deve ter no máximo 1024 caracteres.",
        });
      }
    }

    // TarefaPrazoData: obrigatório, data válida
    if (!tarefa.TarefaPrazoData) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaPrazoData' é obrigatório.",
      });
    }

    const prazo = new Date(tarefa.TarefaPrazoData);
    if (isNaN(prazo.getTime())) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaPrazoData' deve ser uma data válida (ISO 8601).",
      });
    }

    // TarefaTipoEntrega: obrigatório, enum
    if (!tarefa.TarefaTipoEntrega) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaTipoEntrega' é obrigatório.",
      });
    }

    if (!TIPO_ENTREGA_VALID.includes(tarefa.TarefaTipoEntrega)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaTipoEntrega' deve ser 'digital' ou 'fisica'.",
      });
    }

    // anexosDescricao: opcional, array de UUIDs
    if (tarefa.anexosDescricao !== undefined) {
      if (!Array.isArray(tarefa.anexosDescricao)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'anexosDescricao' deve ser um array de UUIDs.",
        });
      }

      for (const guid of tarefa.anexosDescricao) {
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
   * Valida body para atualização de tarefa (PUT)
   *
   * Body: { tarefa: { TarefaTitulo?, TarefaConteudo?, TarefaPrazoData?,
   *                   TarefaTipoEntrega?, TarefaFeito? } }
   */
  validateUpdateBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateUpdateBody()");
    const { tarefa } = request.body;

    if (!tarefa || typeof tarefa !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'tarefa' é obrigatório e deve ser um objeto.",
      });
    }

    // Pelo menos um campo deve ser fornecido
    const camposValidos = [
      "TarefaTitulo",
      "TarefaConteudo",
      "TarefaPrazoData",
      "TarefaTipoEntrega",
      "TarefaFeito",
    ];
    const camposFornecidos = camposValidos.filter((c) => tarefa[c] !== undefined);

    if (camposFornecidos.length === 0) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message:
          "É necessário fornecer ao menos um campo para atualização: " +
          camposValidos.join(", "),
      });
    }

    // TarefaTitulo: opcional, 1-128 chars
    if (tarefa.TarefaTitulo !== undefined) {
      if (typeof tarefa.TarefaTitulo !== "string" || tarefa.TarefaTitulo.trim() === "") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'TarefaTitulo' deve ser uma string não vazia.",
        });
      }
      if (tarefa.TarefaTitulo.trim().length > 128) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'TarefaTitulo' deve ter no máximo 128 caracteres.",
        });
      }
    }

    // TarefaConteudo: opcional, máximo 1024 chars
    if (tarefa.TarefaConteudo !== undefined && tarefa.TarefaConteudo !== null) {
      if (typeof tarefa.TarefaConteudo !== "string") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'TarefaConteudo' deve ser uma string.",
        });
      }
      if (tarefa.TarefaConteudo.trim().length > 1024) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'TarefaConteudo' deve ter no máximo 1024 caracteres.",
        });
      }
    }

    // TarefaPrazoData: opcional, data válida
    if (tarefa.TarefaPrazoData !== undefined) {
      const prazo = new Date(tarefa.TarefaPrazoData);
      if (isNaN(prazo.getTime())) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'TarefaPrazoData' deve ser uma data válida (ISO 8601).",
        });
      }
    }

    // TarefaTipoEntrega: opcional, enum
    if (
      tarefa.TarefaTipoEntrega !== undefined &&
      !TIPO_ENTREGA_VALID.includes(tarefa.TarefaTipoEntrega)
    ) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaTipoEntrega' deve ser 'digital' ou 'fisica'.",
      });
    }

    // TarefaFeito: opcional, booleano
    if (tarefa.TarefaFeito !== undefined && typeof tarefa.TarefaFeito !== "boolean") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaFeito' deve ser um booleano.",
      });
    }

    next();
  };

  /**
   * Valida body para envio de anexo de entrega
   *
   * Body: { AnexoGUID: string }
   */
  validateAnexoEntregaBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateAnexoEntregaBody()");
    const { AnexoGUID } = request.body;

    if (!AnexoGUID || typeof AnexoGUID !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'AnexoGUID' é obrigatório.",
      });
    }

    if (!GUID_REGEX.test(AnexoGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'AnexoGUID' deve ser um UUID válido.",
      });
    }

    next();
  };

  /**
   * Valida query params para busca/listagem
   */
  validateFilters = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateFilters()");
    const { MatriculaGUID, matXprofXturxescGUID, TarefaFeito, DataInicio, DataFim } =
      request.query;

    // MatriculaGUID: opcional, string não vazia
    if (MatriculaGUID !== undefined) {
      if (typeof MatriculaGUID !== "string" || MatriculaGUID.trim() === "") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'MatriculaGUID' deve ser uma string não vazia.",
        });
      }
    }

    // matXprofXturxescGUID: opcional, UUID
    if (matXprofXturxescGUID !== undefined) {
      if (typeof matXprofXturxescGUID !== "string" || !GUID_REGEX.test(matXprofXturxescGUID)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'matXprofXturxescGUID' deve ser um UUID válido.",
        });
      }
    }

    // TarefaFeito: opcional, 'true' ou 'false'
    if (TarefaFeito !== undefined && TarefaFeito !== "true" && TarefaFeito !== "false") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O filtro 'TarefaFeito' deve ser 'true' ou 'false'.",
      });
    }

    // DataInicio: opcional, data válida
    if (DataInicio) {
      const dataInicio = new Date(DataInicio as string);
      if (isNaN(dataInicio.getTime())) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'DataInicio' deve ser uma data válida (ISO 8601).",
        });
      }
    }

    // DataFim: opcional, data válida
    if (DataFim) {
      const dataFim = new Date(DataFim as string);
      if (isNaN(dataFim.getTime())) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O filtro 'DataFim' deve ser uma data válida (ISO 8601).",
        });
      }
    }

    // DataInicio deve ser anterior a DataFim
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
