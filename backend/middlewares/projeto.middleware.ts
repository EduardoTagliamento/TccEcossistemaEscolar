import { Request, Response, NextFunction } from 'express';
import { zodValidate } from '../utils/zodValidate';
import { ProjetoGUIDParamSchema, EscolaGUIDQuerySchema, CreateProjetoBodySchema, UpdateProjetoBodySchema } from '../schemas/projeto.schema';

/**
 * Middleware de validação para rotas de Projeto
 */
export default class ProjetoMiddleware {
  validateProjetoGUIDParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 ProjetoMiddleware.validateProjetoGUIDParam()');
    zodValidate(ProjetoGUIDParamSchema, 'params')(request, response, next);
  };

  validateEscolaGUIDQuery = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 ProjetoMiddleware.validateEscolaGUIDQuery()');
    zodValidate(EscolaGUIDQuerySchema, 'query')(request, response, next);
  };

  validateCreateBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 ProjetoMiddleware.validateCreateBody()');
    zodValidate(CreateProjetoBodySchema, 'body')(request, response, next);
  };

  validateUpdateBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 ProjetoMiddleware.validateUpdateBody()');
    zodValidate(UpdateProjetoBodySchema, 'body')(request, response, next);
  };
}
