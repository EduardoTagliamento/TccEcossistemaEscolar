import { Request, Response, NextFunction } from 'express';
import { zodValidate } from '../utils/zodValidate';
import { ConviteGrupoGUIDParamSchema, ConviteGUIDParamSchema, EnviarConviteBodySchema } from '../schemas/convitegrupotarefa.schema';

/**
 * Middleware de validação para rotas de ConviteGrupoTarefa
 *
 * Valida:
 * - Parâmetros de rota (grupoGUID, conviteGUID)
 * - Body de requisições (UsuarioCPFConvidado)
 */
export default class ConviteGrupoTarefaMiddleware {
  /** Valida o GUID do grupo nos parâmetros */
  validateGrupoGUIDParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 ConviteGrupoTarefaMiddleware.validateGrupoGUIDParam()');
    zodValidate(ConviteGrupoGUIDParamSchema, 'params')(request, response, next);
  };

  /** Valida o GUID do convite nos parâmetros */
  validateConviteGUIDParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 ConviteGrupoTarefaMiddleware.validateConviteGUIDParam()');
    zodValidate(ConviteGUIDParamSchema, 'params')(request, response, next);
  };

  /** Valida body para enviar convite (POST) — Body: { UsuarioCPFConvidado: string } */
  validateEnviarConviteBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 ConviteGrupoTarefaMiddleware.validateEnviarConviteBody()');
    zodValidate(EnviarConviteBodySchema, 'body')(request, response, next);
  };
}
