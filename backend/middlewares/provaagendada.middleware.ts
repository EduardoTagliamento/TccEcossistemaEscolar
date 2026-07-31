import { Request, Response, NextFunction } from "express";
import { zodValidate } from "../utils/zodValidate";
import { ProvaIdParamSchema, ProvaCreateBodySchema, ProvaUpdateBodySchema, ProvaFiltersQuerySchema } from "../schemas/provaagendada.schema";

/**
 * Middleware de validação para rotas de ProvaAgendada (REFATORADO - N:N NORMALIZADO)
 *
 * Cada validator loga no padrão 🔷 e delega a validação em si para um schema
 * Zod (backend/schemas/provaagendada.schema.ts) via o adapter zodValidate,
 * que preserva o contrato de erro ErrorResponse já usado pelo handler global
 * (backend/Server.ts::setupErrorMiddleware).
 */
export default class ProvaAgendadaMiddleware {
  /** Valida o GUID da prova nos parâmetros da rota */
  validateIdParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 ProvaAgendadaMiddleware.validateIdParam()");
    zodValidate(ProvaIdParamSchema, "params")(request, response, next);
  };

  /**
   * Valida body para criação de prova (POST)
   *
   * Body: { prova: { TurmasGUID[], MateriaGUID, ProvaData, ProvaDescricao?, anexosDescricao? } }
   */
  validateCreateBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 ProvaAgendadaMiddleware.validateCreateBody()");
    zodValidate(ProvaCreateBodySchema, "body")(request, response, next);
  };

  /** Valida body para atualização de prova (PUT) */
  validateUpdateBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 ProvaAgendadaMiddleware.validateUpdateBody()");
    zodValidate(ProvaUpdateBodySchema, "body")(request, response, next);
  };

  /** Valida query params para busca/listagem (sem TurmaGUID - agora via join) */
  validateFilters = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 ProvaAgendadaMiddleware.validateFilters()");
    zodValidate(ProvaFiltersQuerySchema, "query")(request, response, next);
  };
}
