import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/ErrorResponse';

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CPF_REGEX = /^[0-9]{11}$/;

/**
 * Middleware de validação para rotas de GrupoTarefa
 * 
 * Valida:
 * - Parâmetros de rota (TarefaGUID, GrupoGUID, CPF)
 * - Body de requisições (GrupoNome, NovoLiderCPF)
 */
export default class GrupoTarefaMiddleware {
  /**
   * Valida o GUID da tarefa nos parâmetros
   */
  validateTarefaGUIDParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoTarefaMiddleware.validateTarefaGUIDParam()');
    const { tarefaGUID } = request.params;

    if (!tarefaGUID) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'tarefaGUID' é obrigatório!"
      });
    }

    if (!GUID_REGEX.test(tarefaGUID)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'tarefaGUID' deve ser um UUID válido."
      });
    }

    next();
  };

  /**
   * Valida o GUID do grupo nos parâmetros
   */
  validateGrupoGUIDParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoTarefaMiddleware.validateGrupoGUIDParam()');
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

  /**
   * Valida o GUID do grupo e CPF do membro nos parâmetros
   */
  validateGrupoAndMembroParams = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoTarefaMiddleware.validateGrupoAndMembroParams()');
    const { grupoGUID, cpf } = request.params;

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

    if (!cpf) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'cpf' é obrigatório!"
      });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!CPF_REGEX.test(cpfLimpo)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'cpf' deve ter 11 dígitos numéricos."
      });
    }

    next();
  };

  /**
   * Valida body para atualizar nome do grupo (PATCH)
   * Body: { GrupoNome: string }
   */
  validateNomeGrupoBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoTarefaMiddleware.validateNomeGrupoBody()');
    const { GrupoNome } = request.body;

    if (!GrupoNome || typeof GrupoNome !== 'string') {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'GrupoNome' é obrigatório e deve ser uma string."
      });
    }

    const nome = GrupoNome.trim();
    if (nome.length < 1 || nome.length > 128) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'GrupoNome' deve ter entre 1 e 128 caracteres."
      });
    }

    next();
  };

  /**
   * Valida body para transferir liderança (PATCH)
   * Body: { NovoLiderCPF: string }
   */
  validateTransferirLiderBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoTarefaMiddleware.validateTransferirLiderBody()');
    const { NovoLiderCPF } = request.body;

    if (!NovoLiderCPF || typeof NovoLiderCPF !== 'string') {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'NovoLiderCPF' é obrigatório e deve ser uma string."
      });
    }

    const cpfLimpo = NovoLiderCPF.replace(/\D/g, '');
    if (!CPF_REGEX.test(cpfLimpo)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'NovoLiderCPF' deve ter 11 dígitos numéricos."
      });
    }

    next();
  };
}
