import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPO_ENTREGA_VALID = ["digital", "fisica", "lista"];
const QUESTAO_TIPO_VALID = ["objetiva", "discursiva"];

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
   * MODELO NORMALIZADO: sempre espera array de MatriculasGUID
   *
   * Body: { tarefa: { MatriculasGUID[], matXprofXturxescGUID, TarefaTitulo, TarefaConteudo?,
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
        message: "O campo 'TarefaTipoEntrega' deve ser 'digital', 'fisica' ou 'lista'.",
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

    // DatasPorMatricula: opcional, objeto { MatriculaGUID: data } (agendamento automático)
    if (tarefa.DatasPorMatricula !== undefined) {
      if (typeof tarefa.DatasPorMatricula !== "object" || Array.isArray(tarefa.DatasPorMatricula)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'DatasPorMatricula' deve ser um objeto { MatriculaGUID: data }.",
        });
      }

      for (const [matriculaGUID, dataMatricula] of Object.entries(tarefa.DatasPorMatricula)) {
        if (!tarefa.MatriculasGUID.includes(matriculaGUID)) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `A matrícula '${matriculaGUID}' em 'DatasPorMatricula' não está em 'MatriculasGUID'.`,
          });
        }
        if (isNaN(new Date(dataMatricula as string).getTime())) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `A data para a matrícula '${matriculaGUID}' em 'DatasPorMatricula' é inválida.`,
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
        message: "O campo 'TarefaTipoEntrega' deve ser 'digital', 'fisica' ou 'lista'.",
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
   * MODELO NORMALIZADO: TarefaFeito não está mais aqui (ver marcar-feito)
   *
   * Body: { tarefa: { TarefaTitulo?, TarefaConteudo?, TarefaPrazoData?, TarefaTipoEntrega? } }
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
        message: "O campo 'TarefaTipoEntrega' deve ser 'digital', 'fisica' ou 'lista'.",
      });
    }

    next();
  };

  /**
   * Valida body para marcar tarefa como feita (PATCH)
   *
   * Body: { MatriculaGUID: string, TarefaFeito: boolean }
   */
  validateMarcarFeitoBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateMarcarFeitoBody()");
    const { MatriculaGUID, TarefaFeito } = request.body;

    // MatriculaGUID: obrigatório
    if (!MatriculaGUID || typeof MatriculaGUID !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'MatriculaGUID' é obrigatório.",
      });
    }

    const matriculaGUID = MatriculaGUID.trim();
    if (matriculaGUID.length < 1 || matriculaGUID.length > 36) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'MatriculaGUID' deve ter entre 1 e 36 caracteres.",
      });
    }

    // TarefaFeito: obrigatório, booleano
    if (TarefaFeito === undefined || typeof TarefaFeito !== "boolean") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'TarefaFeito' é obrigatório e deve ser um booleano.",
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

  // ========== Questão de tarefa "lista" ==========

  /** Valida o payload de UMA questão (usado tanto na criação simples quanto em cada item do batch). */
  #validarPayloadQuestao = (questao: any, prefixo: string): void => {
    if (!questao || typeof questao !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: `${prefixo} deve ser um objeto.`,
      });
    }

    if (!questao.QuestaoEnunciado || typeof questao.QuestaoEnunciado !== "string" || questao.QuestaoEnunciado.trim() === "") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: `${prefixo}.QuestaoEnunciado é obrigatório.`,
      });
    }

    if (!QUESTAO_TIPO_VALID.includes(questao.QuestaoTipo)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: `${prefixo}.QuestaoTipo deve ser 'objetiva' ou 'discursiva'.`,
      });
    }

    if (questao.QuestaoPontosMaximos === undefined || isNaN(Number(questao.QuestaoPontosMaximos)) || Number(questao.QuestaoPontosMaximos) <= 0) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: `${prefixo}.QuestaoPontosMaximos é obrigatório e deve ser um número > 0.`,
      });
    }

    if (questao.QuestaoExplicacao !== undefined && questao.QuestaoExplicacao !== null && typeof questao.QuestaoExplicacao !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: `${prefixo}.QuestaoExplicacao deve ser uma string.`,
      });
    }

    if (questao.QuestaoTipo === "objetiva") {
      if (!Array.isArray(questao.Alternativas) || questao.Alternativas.length < 2) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: `${prefixo}.Alternativas deve ser um array com ao menos 2 itens para questão objetiva.`,
        });
      }
      let corretas = 0;
      for (const alt of questao.Alternativas) {
        if (!alt.AlternativaTexto || typeof alt.AlternativaTexto !== "string" || alt.AlternativaTexto.trim() === "") {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `${prefixo}.Alternativas: AlternativaTexto é obrigatório.`,
          });
        }
        if (typeof alt.AlternativaCorreta !== "boolean") {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `${prefixo}.Alternativas: AlternativaCorreta é obrigatório e deve ser booleano.`,
          });
        }
        if (alt.AlternativaPontos === undefined || isNaN(Number(alt.AlternativaPontos)) || Number(alt.AlternativaPontos) < 0) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `${prefixo}.Alternativas: AlternativaPontos é obrigatório e deve ser um número >= 0.`,
          });
        }
        if (alt.AlternativaCorreta) corretas++;
      }
      if (corretas !== 1) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: `${prefixo}.Alternativas: exatamente uma alternativa deve ser marcada como correta.`,
        });
      }
    }

    if (questao.AnexosGUID !== undefined) {
      if (!Array.isArray(questao.AnexosGUID)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: `${prefixo}.AnexosGUID deve ser um array de UUIDs.`,
        });
      }
      for (const guid of questao.AnexosGUID) {
        if (typeof guid !== "string" || !GUID_REGEX.test(guid)) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `${prefixo}.AnexosGUID: '${guid}' não é um UUID válido.`,
          });
        }
      }
    }
  };

  /** Valida body para criação de questão (POST /api/tarefa/:TarefaGUID/questoes) — Body: { questao: {...} } */
  validateQuestaoCreateBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateQuestaoCreateBody()");
    this.#validarPayloadQuestao(request.body?.questao, "questao");
    next();
  };

  /** Valida body para criação em lote (POST /api/tarefa/:TarefaGUID/questoes/batch) — Body: { questoes: [...] } */
  validateQuestoesBatchBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateQuestoesBatchBody()");
    const { questoes } = request.body;

    if (!Array.isArray(questoes) || questoes.length === 0) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'questoes' é obrigatório e deve ser um array com ao menos 1 item.",
      });
    }

    questoes.forEach((questao: any, index: number) => this.#validarPayloadQuestao(questao, `questoes[${index}]`));

    next();
  };

  /** Valida body para importação de questões via planilha (POST /api/tarefa/:TarefaGUID/questoes/importar) — Body: { linhas: [...] } */
  validateImportarQuestoesBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateImportarQuestoesBody()");
    const { linhas } = request.body;

    if (!Array.isArray(linhas) || linhas.length === 0) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'linhas' é obrigatório e deve ser um array com ao menos 1 item.",
      });
    }

    linhas.forEach((linha: any, index: number) => {
      if (linha.LinhaOriginal === undefined || isNaN(Number(linha.LinhaOriginal))) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: `linhas[${index}].LinhaOriginal é obrigatório.`,
        });
      }
      this.#validarPayloadQuestao(linha, `linhas[${index}]`);
    });

    next();
  };

  /** Valida body para atualização de questão (PUT /api/tarefa/questoes/:QuestaoGUID) — Body: { questao: {...parcial} } */
  validateQuestaoUpdateBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateQuestaoUpdateBody()");
    const { questao } = request.body;

    if (!questao || typeof questao !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'questao' é obrigatório e deve ser um objeto.",
      });
    }

    const camposValidos = ["QuestaoEnunciado", "QuestaoTipo", "QuestaoPontosMaximos", "QuestaoExplicacao", "Alternativas"];
    const camposFornecidos = camposValidos.filter((c) => questao[c] !== undefined);
    if (camposFornecidos.length === 0) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "É necessário fornecer ao menos um campo para atualização: " + camposValidos.join(", "),
      });
    }

    if (questao.QuestaoEnunciado !== undefined && (typeof questao.QuestaoEnunciado !== "string" || questao.QuestaoEnunciado.trim() === "")) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "questao.QuestaoEnunciado deve ser uma string não vazia.",
      });
    }

    if (questao.QuestaoTipo !== undefined && !QUESTAO_TIPO_VALID.includes(questao.QuestaoTipo)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "questao.QuestaoTipo deve ser 'objetiva' ou 'discursiva'.",
      });
    }

    if (questao.QuestaoPontosMaximos !== undefined && (isNaN(Number(questao.QuestaoPontosMaximos)) || Number(questao.QuestaoPontosMaximos) <= 0)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "questao.QuestaoPontosMaximos deve ser um número > 0.",
      });
    }

    if (questao.Alternativas !== undefined) {
      if (!Array.isArray(questao.Alternativas) || questao.Alternativas.length < 2) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "questao.Alternativas deve ser um array com ao menos 2 itens.",
        });
      }
      let corretas = 0;
      for (const alt of questao.Alternativas) {
        if (!alt.AlternativaTexto || typeof alt.AlternativaTexto !== "string" || alt.AlternativaTexto.trim() === "") {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "questao.Alternativas: AlternativaTexto é obrigatório.",
          });
        }
        if (typeof alt.AlternativaCorreta !== "boolean") {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "questao.Alternativas: AlternativaCorreta é obrigatório e deve ser booleano.",
          });
        }
        if (alt.AlternativaPontos === undefined || isNaN(Number(alt.AlternativaPontos)) || Number(alt.AlternativaPontos) < 0) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "questao.Alternativas: AlternativaPontos é obrigatório e deve ser um número >= 0.",
          });
        }
        if (alt.AlternativaCorreta) corretas++;
      }
      if (corretas !== 1) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "questao.Alternativas: exatamente uma alternativa deve ser marcada como correta.",
        });
      }
    }

    next();
  };

  /** Valida body para reordenar questões (PATCH /api/tarefa/:TarefaGUID/questoes/reordenar) — Body: { ordens: [{QuestaoGUID, QuestaoOrdem}] } */
  validateReordenarQuestoesBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateReordenarQuestoesBody()");
    const { ordens } = request.body;

    if (!Array.isArray(ordens) || ordens.length === 0) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'ordens' é obrigatório e deve ser um array com ao menos 1 item.",
      });
    }

    for (const item of ordens) {
      if (!item.QuestaoGUID || !GUID_REGEX.test(item.QuestaoGUID)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "Cada item de 'ordens' precisa de um 'QuestaoGUID' válido.",
        });
      }
      if (item.QuestaoOrdem === undefined || isNaN(Number(item.QuestaoOrdem)) || Number(item.QuestaoOrdem) < 0) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "Cada item de 'ordens' precisa de um 'QuestaoOrdem' >= 0.",
        });
      }
    }

    next();
  };

  /** Valida TarefaGUID e QuestaoGUID nos parâmetros da rota (rotas de resposta do aluno) */
  validateTarefaEQuestaoIdParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateTarefaEQuestaoIdParam()");
    const { TarefaGUID, QuestaoGUID } = request.params;

    if (!TarefaGUID || !GUID_REGEX.test(TarefaGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'TarefaGUID' deve ser um UUID válido.",
      });
    }
    if (!QuestaoGUID || !GUID_REGEX.test(QuestaoGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'QuestaoGUID' deve ser um UUID válido.",
      });
    }

    next();
  };

  /** Valida TarefaGUID e TarefaMatriculaGUID nos parâmetros da rota (painel de correção do professor) */
  validateTarefaEMatriculaIdParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateTarefaEMatriculaIdParam()");
    const { TarefaGUID, TarefaMatriculaGUID } = request.params;

    if (!TarefaGUID || !GUID_REGEX.test(TarefaGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'TarefaGUID' deve ser um UUID válido.",
      });
    }
    if (!TarefaMatriculaGUID || TarefaMatriculaGUID.trim().length < 1 || TarefaMatriculaGUID.trim().length > 36) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'TarefaMatriculaGUID' é obrigatório.",
      });
    }

    next();
  };

  /** Valida o GUID de questão nos parâmetros da rota */
  validateQuestaoIdParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateQuestaoIdParam()");
    const { QuestaoGUID } = request.params;

    if (!QuestaoGUID || !GUID_REGEX.test(QuestaoGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'QuestaoGUID' deve ser um UUID válido.",
      });
    }

    next();
  };

  /** Valida body para vincular anexo a questão (POST /api/tarefa/questoes/:QuestaoGUID/anexos) — Body: { AnexoGUID } */
  validateAnexoQuestaoBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateAnexoQuestaoBody()");
    const { AnexoGUID } = request.body;

    if (!AnexoGUID || typeof AnexoGUID !== "string" || !GUID_REGEX.test(AnexoGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'AnexoGUID' é obrigatório e deve ser um UUID válido.",
      });
    }

    next();
  };

  /** Valida body para resposta objetiva (POST .../responder-objetiva) — Body: { AlternativaGUID } */
  validateResponderObjetivaBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateResponderObjetivaBody()");
    const { AlternativaGUID } = request.body;

    if (!AlternativaGUID || typeof AlternativaGUID !== "string" || !GUID_REGEX.test(AlternativaGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'AlternativaGUID' é obrigatório e deve ser um UUID válido.",
      });
    }

    next();
  };

  /** Valida body para resposta discursiva (POST .../responder-discursiva) — Body: { Texto } */
  validateResponderDiscursivaBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateResponderDiscursivaBody()");
    const { Texto } = request.body;

    if (!Texto || typeof Texto !== "string" || Texto.trim() === "") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'Texto' é obrigatório e não pode ser vazio.",
      });
    }

    if (Texto.trim().length > 8000) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'Texto' deve ter no máximo 8000 caracteres.",
      });
    }

    next();
  };

  /** Valida o GUID de resposta nos parâmetros da rota */
  validateRespostaIdParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateRespostaIdParam()");
    const { RespostaGUID } = request.params;

    if (!RespostaGUID || !GUID_REGEX.test(RespostaGUID)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'RespostaGUID' deve ser um UUID válido.",
      });
    }

    next();
  };

  /** Valida body para correção de discursiva (PATCH /api/tarefa/respostas/:RespostaGUID/avaliar) — Body: { Pontos } */
  validateAvaliarQuestaoBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateAvaliarQuestaoBody()");
    const { Pontos } = request.body;

    if (Pontos === undefined || isNaN(Number(Pontos)) || Number(Pontos) < 0) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'Pontos' é obrigatório e deve ser um número >= 0.",
      });
    }

    next();
  };
}
