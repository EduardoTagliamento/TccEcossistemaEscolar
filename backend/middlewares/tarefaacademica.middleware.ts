import { Request, Response, NextFunction } from "express";
import { zodValidate } from "../utils/zodValidate";
import {
  TarefaIdParamSchema,
  TarefaIdComAnexoParamSchema,
  TarefaCreateBodySchema,
  TarefaBatchCreateBodySchema,
  TarefaUpdateBodySchema,
  MarcarFeitoBodySchema,
  AnexoEntregaBodySchema,
  TarefaFiltersQuerySchema,
  QuestaoCreateBodySchema,
  QuestoesBatchBodySchema,
  ImportarQuestoesBodySchema,
  QuestaoUpdateBodySchema,
  ReordenarQuestoesBodySchema,
  TarefaEQuestaoIdParamSchema,
  TarefaEMatriculaIdParamSchema,
  QuestaoIdParamSchema,
  AnexoQuestaoBodySchema,
  ResponderObjetivaBodySchema,
  ResponderDiscursivaBodySchema,
  RespostaIdParamSchema,
  AvaliarQuestaoBodySchema,
} from "../schemas/tarefaacademica.schema";

/**
 * Middleware de validação para rotas de TarefaAcademica
 *
 * Valida:
 * - Parâmetros de rota (TarefaGUID, AnexoGUID)
 * - Body de criação e atualização
 * - Filtros de busca (query params)
 *
 * Cada validator loga no padrão 🔷 e delega a validação em si para um
 * schema Zod (backend/schemas/tarefaacademica.schema.ts) via o adapter
 * zodValidate, que preserva o contrato de erro ErrorResponse já usado
 * pelo handler global (backend/Server.ts::setupErrorMiddleware).
 */
export default class TarefaAcademicaMiddleware {
  /** Valida o GUID da tarefa nos parâmetros da rota */
  validateIdParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateIdParam()");
    zodValidate(TarefaIdParamSchema, "params")(request, response, next);
  };

  /** Valida o GUID da tarefa e do anexo nos parâmetros da rota */
  validateIdParamWithAnexo = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateIdParamWithAnexo()");
    zodValidate(TarefaIdComAnexoParamSchema, "params")(request, response, next);
  };

  /**
   * Valida body para criação de tarefa (POST)
   * MODELO NORMALIZADO: sempre espera array de MatriculasGUID
   *
   * Body: { tarefa: { MatriculasGUID[], matXprofXturxescGUID, TarefaTitulo, TarefaConteudo?,
   *                   TarefaPrazoData, TarefaTipoEntrega, anexosDescricao? } }
   */
  validateCreateBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateCreateBody()");
    zodValidate(TarefaCreateBodySchema, "body")(request, response, next);
  };

  /**
   * Valida body para criação de múltiplas tarefas (POST /batch)
   *
   * Body: { tarefa: { MatriculasGUID[], matXprofXturxescGUID, TarefaTitulo, TarefaConteudo?,
   *                   TarefaPrazoData, TarefaTipoEntrega, anexosDescricao? } }
   */
  validateBatchCreateBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateBatchCreateBody()");
    zodValidate(TarefaBatchCreateBodySchema, "body")(request, response, next);
  };

  /**
   * Valida body para atualização de tarefa (PUT)
   * MODELO NORMALIZADO: TarefaFeito não está mais aqui (ver marcar-feito)
   *
   * Body: { tarefa: { TarefaTitulo?, TarefaConteudo?, TarefaPrazoData?, TarefaTipoEntrega? } }
   */
  validateUpdateBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateUpdateBody()");
    zodValidate(TarefaUpdateBodySchema, "body")(request, response, next);
  };

  /**
   * Valida body para marcar tarefa como feita (PATCH)
   *
   * Body: { MatriculaGUID: string, TarefaFeito: boolean }
   */
  validateMarcarFeitoBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateMarcarFeitoBody()");
    zodValidate(MarcarFeitoBodySchema, "body")(request, response, next);
  };

  /**
   * Valida body para envio de anexo de entrega
   *
   * Body: { AnexoGUID: string }
   */
  validateAnexoEntregaBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateAnexoEntregaBody()");
    zodValidate(AnexoEntregaBodySchema, "body")(request, response, next);
  };

  /** Valida query params para busca/listagem */
  validateFilters = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateFilters()");
    zodValidate(TarefaFiltersQuerySchema, "query")(request, response, next);
  };

  // ========== Questão de tarefa "lista" ==========

  /** Valida body para criação de questão (POST /api/tarefa/:TarefaGUID/questoes) — Body: { questao: {...} } */
  validateQuestaoCreateBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateQuestaoCreateBody()");
    zodValidate(QuestaoCreateBodySchema, "body")(request, response, next);
  };

  /** Valida body para criação em lote (POST /api/tarefa/:TarefaGUID/questoes/batch) — Body: { questoes: [...] } */
  validateQuestoesBatchBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateQuestoesBatchBody()");
    zodValidate(QuestoesBatchBodySchema, "body")(request, response, next);
  };

  /** Valida body para importação de questões via planilha (POST /api/tarefa/:TarefaGUID/questoes/importar) — Body: { linhas: [...] } */
  validateImportarQuestoesBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateImportarQuestoesBody()");
    zodValidate(ImportarQuestoesBodySchema, "body")(request, response, next);
  };

  /** Valida body para atualização de questão (PUT /api/tarefa/questoes/:QuestaoGUID) — Body: { questao: {...parcial} } */
  validateQuestaoUpdateBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateQuestaoUpdateBody()");
    zodValidate(QuestaoUpdateBodySchema, "body")(request, response, next);
  };

  /** Valida body para reordenar questões (PATCH /api/tarefa/:TarefaGUID/questoes/reordenar) — Body: { ordens: [{QuestaoGUID, QuestaoOrdem}] } */
  validateReordenarQuestoesBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateReordenarQuestoesBody()");
    zodValidate(ReordenarQuestoesBodySchema, "body")(request, response, next);
  };

  /** Valida TarefaGUID e QuestaoGUID nos parâmetros da rota (rotas de resposta do aluno) */
  validateTarefaEQuestaoIdParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateTarefaEQuestaoIdParam()");
    zodValidate(TarefaEQuestaoIdParamSchema, "params")(request, response, next);
  };

  /** Valida TarefaGUID e TarefaMatriculaGUID nos parâmetros da rota (painel de correção do professor) */
  validateTarefaEMatriculaIdParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateTarefaEMatriculaIdParam()");
    zodValidate(TarefaEMatriculaIdParamSchema, "params")(request, response, next);
  };

  /** Valida o GUID de questão nos parâmetros da rota */
  validateQuestaoIdParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateQuestaoIdParam()");
    zodValidate(QuestaoIdParamSchema, "params")(request, response, next);
  };

  /** Valida body para vincular anexo a questão (POST /api/tarefa/questoes/:QuestaoGUID/anexos) — Body: { AnexoGUID } */
  validateAnexoQuestaoBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateAnexoQuestaoBody()");
    zodValidate(AnexoQuestaoBodySchema, "body")(request, response, next);
  };

  /** Valida body para resposta objetiva (POST .../responder-objetiva) — Body: { AlternativaGUID } */
  validateResponderObjetivaBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateResponderObjetivaBody()");
    zodValidate(ResponderObjetivaBodySchema, "body")(request, response, next);
  };

  /** Valida body para resposta discursiva (POST .../responder-discursiva) — Body: { Texto } */
  validateResponderDiscursivaBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateResponderDiscursivaBody()");
    zodValidate(ResponderDiscursivaBodySchema, "body")(request, response, next);
  };

  /** Valida o GUID de resposta nos parâmetros da rota */
  validateRespostaIdParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateRespostaIdParam()");
    zodValidate(RespostaIdParamSchema, "params")(request, response, next);
  };

  /** Valida body para correção de discursiva (PATCH /api/tarefa/respostas/:RespostaGUID/avaliar) — Body: { Pontos } */
  validateAvaliarQuestaoBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 TarefaAcademicaMiddleware.validateAvaliarQuestaoBody()");
    zodValidate(AvaliarQuestaoBodySchema, "body")(request, response, next);
  };
}
