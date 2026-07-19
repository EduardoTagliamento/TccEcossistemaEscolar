import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/ErrorResponse';

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CPF_REGEX = /^[0-9]{11}$/;

/**
 * Middleware de validação para rotas de ConviteGrupoProjeto
 */
export default class ConviteGrupoProjetoMiddleware {
  validateGrupoGUIDParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 ConviteGrupoProjetoMiddleware.validateGrupoGUIDParam()');
    const { grupoGUID } = request.params;

    if (!grupoGUID) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'grupoGUID' é obrigatório!"
      });
    }

    if (!GUID_REGEX.test(grupoGUID)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'grupoGUID' deve ser um UUID válido."
      });
    }

    next();
  };

  validateConviteGUIDParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 ConviteGrupoProjetoMiddleware.validateConviteGUIDParam()');
    const { conviteGUID } = request.params;

    if (!conviteGUID) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'conviteGUID' é obrigatório!"
      });
    }

    if (!GUID_REGEX.test(conviteGUID)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'conviteGUID' deve ser um UUID válido."
      });
    }

    next();
  };

  validateEnviarConviteBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 ConviteGrupoProjetoMiddleware.validateEnviarConviteBody()');
    const { UsuarioCPFConvidado } = request.body;

    if (!UsuarioCPFConvidado || typeof UsuarioCPFConvidado !== 'string') {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'UsuarioCPFConvidado' é obrigatório e deve ser uma string."
      });
    }

    const cpfLimpo = UsuarioCPFConvidado.replace(/\D/g, '');
    if (!CPF_REGEX.test(cpfLimpo)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'UsuarioCPFConvidado' deve ter 11 dígitos numéricos."
      });
    }

    next();
  };
}
