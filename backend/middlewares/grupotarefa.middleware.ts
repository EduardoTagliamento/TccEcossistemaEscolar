import { Request, Response, NextFunction } from 'express';
import { zodValidate } from '../utils/zodValidate';
import {
  TarefaGUIDParamSchema,
  GrupoGUIDParamSchema,
  GrupoAndMembroParamsSchema,
  NomeGrupoBodySchema,
  TransferirLiderBodySchema,
} from '../schemas/grupotarefa.schema';

/**
 * Middleware de validação para rotas de GrupoTarefa
 *
 * Valida:
 * - Parâmetros de rota (tarefaGUID, grupoGUID, cpf)
 * - Body de requisições (GrupoNome, NovoLiderCPF)
 */
export default class GrupoTarefaMiddleware {
  /** Valida o GUID da tarefa nos parâmetros */
  validateTarefaGUIDParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoTarefaMiddleware.validateTarefaGUIDParam()');
    zodValidate(TarefaGUIDParamSchema, 'params')(request, response, next);
  };

  /** Valida o GUID do grupo nos parâmetros */
  validateGrupoGUIDParam = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoTarefaMiddleware.validateGrupoGUIDParam()');
    zodValidate(GrupoGUIDParamSchema, 'params')(request, response, next);
  };

  /** Valida o GUID do grupo e CPF do membro nos parâmetros */
  validateGrupoAndMembroParams = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoTarefaMiddleware.validateGrupoAndMembroParams()');
    zodValidate(GrupoAndMembroParamsSchema, 'params')(request, response, next);
  };

  /** Valida body para atualizar nome do grupo (PATCH) — Body: { GrupoNome: string } */
  validateNomeGrupoBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoTarefaMiddleware.validateNomeGrupoBody()');
    zodValidate(NomeGrupoBodySchema, 'body')(request, response, next);
  };

  /** Valida body para transferir liderança (PATCH) — Body: { NovoLiderCPF: string } */
  validateTransferirLiderBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoTarefaMiddleware.validateTransferirLiderBody()');
    zodValidate(TransferirLiderBodySchema, 'body')(request, response, next);
  };
}
