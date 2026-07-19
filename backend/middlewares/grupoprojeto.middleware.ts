import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/ErrorResponse';

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CPF_REGEX = /^[0-9]{11}$/;

/**
 * Middleware de validação para rotas de GrupoProjeto
 */
export default class GrupoProjetoMiddleware {
  validateProjetoGUIDParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateProjetoGUIDParam()');
    const { projetoGUID } = request.params;

    if (!projetoGUID) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'projetoGUID' é obrigatório!"
      });
    }

    if (!GUID_REGEX.test(projetoGUID)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'projetoGUID' deve ser um UUID válido."
      });
    }

    next();
  };

  validateGrupoGUIDParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateGrupoGUIDParam()');
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

  validateGrupoAndMembroParams = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateGrupoAndMembroParams()');
    const { grupoGUID, cpf } = request.params;

    if (!grupoGUID || !GUID_REGEX.test(grupoGUID)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'grupoGUID' deve ser um UUID válido."
      });
    }

    const cpfLimpo = (cpf || '').replace(/\D/g, '');
    if (!CPF_REGEX.test(cpfLimpo)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'cpf' deve ter 11 dígitos numéricos."
      });
    }

    next();
  };

  validateCreateGrupoBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateCreateGrupoBody()');
    const body = request.body;

    if (!body.ProjetoGUID || typeof body.ProjetoGUID !== 'string' || !GUID_REGEX.test(body.ProjetoGUID)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoGUID' é obrigatório e deve ser um UUID válido."
      });
    }

    if (!body.GrupoProjetoProposta || typeof body.GrupoProjetoProposta !== 'string' || body.GrupoProjetoProposta.trim().length < 1 || body.GrupoProjetoProposta.length > 2048) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'GrupoProjetoProposta' é obrigatório e deve ter entre 1 e 2048 caracteres."
      });
    }

    if (body.GrupoProjetoVisibilidade !== 'Aberto' && body.GrupoProjetoVisibilidade !== 'Fechado') {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'GrupoProjetoVisibilidade' deve ser 'Aberto' ou 'Fechado'."
      });
    }

    if (body.GrupoProjetoNome !== undefined && body.GrupoProjetoNome !== null) {
      if (typeof body.GrupoProjetoNome !== 'string' || body.GrupoProjetoNome.length > 128) {
        throw new ErrorResponse(400, 'Erro na validação de dados', {
          message: "O campo 'GrupoProjetoNome' deve ter no máximo 128 caracteres."
        });
      }
    }

    next();
  };

  validateUpdateGrupoBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateUpdateGrupoBody()');
    const body = request.body;

    const camposPossiveis = ['GrupoProjetoNome', 'GrupoProjetoProposta', 'GrupoProjetoVisibilidade'];
    if (!camposPossiveis.some((campo) => body[campo] !== undefined)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: `Envie ao menos um campo para atualizar: ${camposPossiveis.join(', ')}.`
      });
    }

    if (body.GrupoProjetoProposta !== undefined && (typeof body.GrupoProjetoProposta !== 'string' || body.GrupoProjetoProposta.trim().length < 1 || body.GrupoProjetoProposta.length > 2048)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'GrupoProjetoProposta' deve ter entre 1 e 2048 caracteres."
      });
    }

    if (body.GrupoProjetoVisibilidade !== undefined && body.GrupoProjetoVisibilidade !== 'Aberto' && body.GrupoProjetoVisibilidade !== 'Fechado') {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'GrupoProjetoVisibilidade' deve ser 'Aberto' ou 'Fechado'."
      });
    }

    if (body.GrupoProjetoNome !== undefined && body.GrupoProjetoNome !== null && (typeof body.GrupoProjetoNome !== 'string' || body.GrupoProjetoNome.length > 128)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'GrupoProjetoNome' deve ter no máximo 128 caracteres."
      });
    }

    next();
  };

  validatePontuacaoBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validatePontuacaoBody()');
    const { GrupoProjetoPontuacao } = request.body;

    if (GrupoProjetoPontuacao === undefined || typeof GrupoProjetoPontuacao !== 'number' || isNaN(GrupoProjetoPontuacao) || GrupoProjetoPontuacao < 0) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'GrupoProjetoPontuacao' é obrigatório e deve ser um número >= 0."
      });
    }

    next();
  };

  validateAdicionarMembroBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateAdicionarMembroBody()');
    const { UsuarioCPF } = request.body;

    if (!UsuarioCPF || typeof UsuarioCPF !== 'string') {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'UsuarioCPF' é obrigatório e deve ser uma string."
      });
    }

    const cpfLimpo = UsuarioCPF.replace(/\D/g, '');
    if (!CPF_REGEX.test(cpfLimpo)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'UsuarioCPF' deve ter 11 dígitos numéricos."
      });
    }

    next();
  };

  validateTransferirLiderBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 GrupoProjetoMiddleware.validateTransferirLiderBody()');
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
