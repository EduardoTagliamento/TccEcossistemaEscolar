import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/ErrorResponse';

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware de validação para rotas de Projeto
 */
export default class ProjetoMiddleware {
  validateProjetoGUIDParam = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 ProjetoMiddleware.validateProjetoGUIDParam()');
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

  validateEscolaGUIDQuery = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 ProjetoMiddleware.validateEscolaGUIDQuery()');
    const { EscolaGUID } = request.query;

    if (!EscolaGUID || typeof EscolaGUID !== 'string') {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'EscolaGUID' é obrigatório na query string."
      });
    }

    if (!GUID_REGEX.test(EscolaGUID)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O parâmetro 'EscolaGUID' deve ser um UUID válido."
      });
    }

    next();
  };

  validateCreateBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 ProjetoMiddleware.validateCreateBody()');
    const body = request.body;

    if (!body.EscolaGUID || typeof body.EscolaGUID !== 'string' || !GUID_REGEX.test(body.EscolaGUID)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'EscolaGUID' é obrigatório e deve ser um UUID válido."
      });
    }

    if (!body.ProjetoTitulo || typeof body.ProjetoTitulo !== 'string' || body.ProjetoTitulo.trim().length < 1 || body.ProjetoTitulo.length > 128) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoTitulo' é obrigatório e deve ter entre 1 e 128 caracteres."
      });
    }

    if (!body.ProjetoDescricao || typeof body.ProjetoDescricao !== 'string' || body.ProjetoDescricao.trim().length < 1 || body.ProjetoDescricao.length > 2048) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoDescricao' é obrigatório e deve ter entre 1 e 2048 caracteres."
      });
    }

    if (body.ProjetoMecanicaPontuacao !== undefined && body.ProjetoMecanicaPontuacao !== null) {
      if (typeof body.ProjetoMecanicaPontuacao !== 'string' || body.ProjetoMecanicaPontuacao.length > 1024) {
        throw new ErrorResponse(400, 'Erro na validação de dados', {
          message: "O campo 'ProjetoMecanicaPontuacao' deve ter no máximo 1024 caracteres."
        });
      }
    }

    if (body.ProjetoPublicoAlvo !== 'Escola' && body.ProjetoPublicoAlvo !== 'Turmas') {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoPublicoAlvo' deve ser 'Escola' ou 'Turmas'."
      });
    }

    if (body.ProjetoPublicoAlvo === 'Turmas') {
      if (!Array.isArray(body.TurmasGUID) || body.TurmasGUID.length === 0) {
        throw new ErrorResponse(400, 'Erro na validação de dados', {
          message: "O campo 'TurmasGUID' é obrigatório e não pode ser vazio quando 'ProjetoPublicoAlvo' é 'Turmas'."
        });
      }
      const turmaInvalida = body.TurmasGUID.some((guid: unknown) => typeof guid !== 'string' || !GUID_REGEX.test(guid));
      if (turmaInvalida) {
        throw new ErrorResponse(400, 'Erro na validação de dados', {
          message: "Todos os itens de 'TurmasGUID' devem ser UUIDs válidos."
        });
      }
    }

    if (
      body.ProjetoGrupoMinPessoas === undefined ||
      typeof body.ProjetoGrupoMinPessoas !== 'number' ||
      !Number.isInteger(body.ProjetoGrupoMinPessoas) ||
      body.ProjetoGrupoMinPessoas < 1
    ) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoGrupoMinPessoas' é obrigatório e deve ser um inteiro >= 1."
      });
    }

    if (
      body.ProjetoGrupoMaxPessoas === undefined ||
      typeof body.ProjetoGrupoMaxPessoas !== 'number' ||
      !Number.isInteger(body.ProjetoGrupoMaxPessoas) ||
      body.ProjetoGrupoMaxPessoas < body.ProjetoGrupoMinPessoas
    ) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoGrupoMaxPessoas' é obrigatório e deve ser um inteiro >= ProjetoGrupoMinPessoas."
      });
    }

    if (!body.ProjetoInscricaoPrazoData || isNaN(new Date(body.ProjetoInscricaoPrazoData).getTime())) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoInscricaoPrazoData' é obrigatório e deve ser uma data válida."
      });
    }

    if (body.ProjetoEntregaPrazoData !== undefined && body.ProjetoEntregaPrazoData !== null) {
      if (isNaN(new Date(body.ProjetoEntregaPrazoData).getTime())) {
        throw new ErrorResponse(400, 'Erro na validação de dados', {
          message: "O campo 'ProjetoEntregaPrazoData' deve ser uma data válida."
        });
      }
    }

    next();
  };

  validateUpdateBody = (request: Request, _response: Response, next: NextFunction): void => {
    console.log('🔷 ProjetoMiddleware.validateUpdateBody()');
    const body = request.body;

    const camposPossiveis = [
      'ProjetoTitulo',
      'ProjetoDescricao',
      'ProjetoMecanicaPontuacao',
      'ProjetoGrupoMinPessoas',
      'ProjetoGrupoMaxPessoas',
      'ProjetoInscricaoPrazoData',
      'ProjetoEntregaPrazoData'
    ];

    if (!camposPossiveis.some((campo) => body[campo] !== undefined)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: `Envie ao menos um campo para atualizar: ${camposPossiveis.join(', ')}.`
      });
    }

    if (body.ProjetoTitulo !== undefined && (typeof body.ProjetoTitulo !== 'string' || body.ProjetoTitulo.trim().length < 1 || body.ProjetoTitulo.length > 128)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoTitulo' deve ter entre 1 e 128 caracteres."
      });
    }

    if (body.ProjetoDescricao !== undefined && (typeof body.ProjetoDescricao !== 'string' || body.ProjetoDescricao.trim().length < 1 || body.ProjetoDescricao.length > 2048)) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoDescricao' deve ter entre 1 e 2048 caracteres."
      });
    }

    if (
      body.ProjetoGrupoMinPessoas !== undefined &&
      (typeof body.ProjetoGrupoMinPessoas !== 'number' || !Number.isInteger(body.ProjetoGrupoMinPessoas) || body.ProjetoGrupoMinPessoas < 1)
    ) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoGrupoMinPessoas' deve ser um inteiro >= 1."
      });
    }

    if (
      body.ProjetoGrupoMaxPessoas !== undefined &&
      (typeof body.ProjetoGrupoMaxPessoas !== 'number' || !Number.isInteger(body.ProjetoGrupoMaxPessoas) || body.ProjetoGrupoMaxPessoas < 1)
    ) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoGrupoMaxPessoas' deve ser um inteiro >= 1."
      });
    }

    if (body.ProjetoInscricaoPrazoData !== undefined && isNaN(new Date(body.ProjetoInscricaoPrazoData).getTime())) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoInscricaoPrazoData' deve ser uma data válida."
      });
    }

    if (
      body.ProjetoEntregaPrazoData !== undefined &&
      body.ProjetoEntregaPrazoData !== null &&
      isNaN(new Date(body.ProjetoEntregaPrazoData).getTime())
    ) {
      throw new ErrorResponse(400, 'Erro na validação de dados', {
        message: "O campo 'ProjetoEntregaPrazoData' deve ser uma data válida."
      });
    }

    next();
  };
}
