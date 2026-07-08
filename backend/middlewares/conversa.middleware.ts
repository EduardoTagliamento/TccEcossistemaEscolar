import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/ErrorResponse';

export class ConversaMiddleware {
  static validarGUID = (req: Request, _res: Response, next: NextFunction): void => {
    console.log('🔷 ConversaMiddleware.validarGUID()');
    const { guid } = req.params;
    if (!guid || guid.trim().length !== 36) {
      return next(new ErrorResponse(400, 'ConversaGUID inválido', {
        message: 'O identificador da conversa deve ser um UUID de 36 caracteres',
      }));
    }
    next();
  };

  static validarMsgGUID = (req: Request, _res: Response, next: NextFunction): void => {
    console.log('🔷 ConversaMiddleware.validarMsgGUID()');
    const { msgGuid } = req.params;
    if (!msgGuid || msgGuid.trim().length !== 36) {
      return next(new ErrorResponse(400, 'MensagemGUID inválido', {
        message: 'O identificador da mensagem deve ser um UUID de 36 caracteres',
      }));
    }
    next();
  };

  static validarIniciarIndividual = (req: Request, _res: Response, next: NextFunction): void => {
    console.log('🔷 ConversaMiddleware.validarIniciarIndividual()');
    const { DestinatarioCPF } = req.body;

    if (!DestinatarioCPF || typeof DestinatarioCPF !== 'string' || DestinatarioCPF.trim().length === 0) {
      return next(new ErrorResponse(400, 'DestinatarioCPF é obrigatório'));
    }

    if (DestinatarioCPF.trim() === req.user?.UsuarioCPF) {
      return next(new ErrorResponse(400, 'Não é possível iniciar uma conversa consigo mesmo'));
    }

    next();
  };

  static validarCPFBody = (req: Request, _res: Response, next: NextFunction): void => {
    console.log('🔷 ConversaMiddleware.validarCPFBody()');
    const { UsuarioCPF } = req.body;
    if (!UsuarioCPF || typeof UsuarioCPF !== 'string' || UsuarioCPF.trim().length === 0) {
      return next(new ErrorResponse(400, 'UsuarioCPF é obrigatório'));
    }
    next();
  };

  static validarCPFParam = (req: Request, _res: Response, next: NextFunction): void => {
    console.log('🔷 ConversaMiddleware.validarCPFParam()');
    const { cpf } = req.params;
    if (!cpf || cpf.trim().length === 0) {
      return next(new ErrorResponse(400, 'CPF inválido'));
    }
    next();
  };

  static validarEditarBody = (req: Request, _res: Response, next: NextFunction): void => {
    console.log('🔷 ConversaMiddleware.validarEditarBody()');
    const { MensagemConteudo } = req.body;
    if (!MensagemConteudo || typeof MensagemConteudo !== 'string' || MensagemConteudo.trim().length === 0) {
      return next(new ErrorResponse(400, 'MensagemConteudo é obrigatório'));
    }
    if (MensagemConteudo.trim().length > 4000) {
      return next(new ErrorResponse(400, 'MensagemConteudo não pode exceder 4000 caracteres'));
    }
    next();
  };
}
