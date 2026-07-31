import { Request, Response, NextFunction } from 'express';
import { zodValidate } from '../utils/zodValidate';
import { ConviteGrupoGUIDParamSchema, ConviteGUIDParamSchema, EnviarConviteBodySchema } from '../schemas/convitegrupoprojeto.schema';

/**
 * Middleware de validação para rotas de ConviteGrupoProjeto
 */
export default class ConviteGrupoProjetoMiddleware {
  validateGrupoGUIDParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 ConviteGrupoProjetoMiddleware.validateGrupoGUIDParam()');
    zodValidate(ConviteGrupoGUIDParamSchema, 'params')(request, response, next);
  };

  validateConviteGUIDParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 ConviteGrupoProjetoMiddleware.validateConviteGUIDParam()');
    zodValidate(ConviteGUIDParamSchema, 'params')(request, response, next);
  };

  validateEnviarConviteBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 ConviteGrupoProjetoMiddleware.validateEnviarConviteBody()');
    zodValidate(EnviarConviteBodySchema, 'body')(request, response, next);
  };
}
