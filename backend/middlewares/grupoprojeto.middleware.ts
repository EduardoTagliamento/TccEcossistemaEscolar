import { Request, Response, NextFunction } from 'express';
import { zodValidate } from '../utils/zodValidate';
import {
  ProjetoGUIDParamSchema,
  GrupoGUIDParamSchema,
  GrupoAndMembroParamsSchema,
  CreateGrupoBodySchema,
  UpdateGrupoBodySchema,
  PontuacaoBodySchema,
  AdicionarMembroBodySchema,
  TransferirLiderBodySchema,
} from '../schemas/grupoprojeto.schema';

/**
 * Middleware de validação para rotas de GrupoProjeto
 */
export default class GrupoProjetoMiddleware {
  validateProjetoGUIDParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateProjetoGUIDParam()');
    zodValidate(ProjetoGUIDParamSchema, 'params')(request, response, next);
  };

  validateGrupoGUIDParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateGrupoGUIDParam()');
    zodValidate(GrupoGUIDParamSchema, 'params')(request, response, next);
  };

  validateGrupoAndMembroParams = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateGrupoAndMembroParams()');
    zodValidate(GrupoAndMembroParamsSchema, 'params')(request, response, next);
  };

  validateCreateGrupoBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateCreateGrupoBody()');
    zodValidate(CreateGrupoBodySchema, 'body')(request, response, next);
  };

  validateUpdateGrupoBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateUpdateGrupoBody()');
    zodValidate(UpdateGrupoBodySchema, 'body')(request, response, next);
  };

  validatePontuacaoBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validatePontuacaoBody()');
    zodValidate(PontuacaoBodySchema, 'body')(request, response, next);
  };

  validateAdicionarMembroBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateAdicionarMembroBody()');
    zodValidate(AdicionarMembroBodySchema, 'body')(request, response, next);
  };

  validateTransferirLiderBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateTransferirLiderBody()');
    zodValidate(TransferirLiderBodySchema, 'body')(request, response, next);
  };
}
