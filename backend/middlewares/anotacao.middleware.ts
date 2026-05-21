import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../utils/ErrorResponse';

export class AnotacaoMiddleware {
  // Validar body de criação
  static validarCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { EscolaGUID, AnotacaoData, AnotacaoTitulo } = req.body;

      // Campos obrigatórios
      if (!EscolaGUID) {
        throw new ErrorResponse('EscolaGUID é obrigatório', 400);
      }

      if (!AnotacaoData) {
        throw new ErrorResponse('AnotacaoData é obrigatória', 400);
      }

      if (!AnotacaoTitulo) {
        throw new ErrorResponse('AnotacaoTitulo é obrigatório', 400);
      }

      // Validar formato de data
      const dataObj = new Date(AnotacaoData);
      if (isNaN(dataObj.getTime())) {
        throw new ErrorResponse('AnotacaoData inválida (use formato ISO 8601)', 400);
      }

      // Validar tamanho do título
      if (typeof AnotacaoTitulo !== 'string' || AnotacaoTitulo.trim().length === 0) {
        throw new ErrorResponse('AnotacaoTitulo não pode ser vazio', 400);
      }

      if (AnotacaoTitulo.length > 256) {
        throw new ErrorResponse('AnotacaoTitulo não pode exceder 256 caracteres', 400);
      }

      // Validar descrição (se fornecida)
      if (req.body.AnotacaoDescricao !== undefined) {
        if (typeof req.body.AnotacaoDescricao !== 'string') {
          throw new ErrorResponse('AnotacaoDescricao deve ser uma string', 400);
        }

        if (req.body.AnotacaoDescricao.length > 2048) {
          throw new ErrorResponse('AnotacaoDescricao não pode exceder 2048 caracteres', 400);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  // Validar body de atualização
  static validarUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { AnotacaoData, AnotacaoTitulo, AnotacaoDescricao, AnotacaoIsFeito } = req.body;

      // Pelo menos um campo deve ser fornecido
      if (
        AnotacaoData === undefined &&
        AnotacaoTitulo === undefined &&
        AnotacaoDescricao === undefined &&
        AnotacaoIsFeito === undefined
      ) {
        throw new ErrorResponse('Nenhum campo para atualizar foi fornecido', 400);
      }

      // Validar AnotacaoData (se fornecida)
      if (AnotacaoData !== undefined) {
        const dataObj = new Date(AnotacaoData);
        if (isNaN(dataObj.getTime())) {
          throw new ErrorResponse('AnotacaoData inválida', 400);
        }
      }

      // Validar AnotacaoTitulo (se fornecido)
      if (AnotacaoTitulo !== undefined) {
        if (typeof AnotacaoTitulo !== 'string' || AnotacaoTitulo.trim().length === 0) {
          throw new ErrorResponse('AnotacaoTitulo não pode ser vazio', 400);
        }

        if (AnotacaoTitulo.length > 256) {
          throw new ErrorResponse('AnotacaoTitulo não pode exceder 256 caracteres', 400);
        }
      }

      // Validar AnotacaoDescricao (se fornecida)
      if (AnotacaoDescricao !== undefined) {
        if (AnotacaoDescricao !== null && typeof AnotacaoDescricao !== 'string') {
          throw new ErrorResponse('AnotacaoDescricao deve ser string ou null', 400);
        }

        if (AnotacaoDescricao && AnotacaoDescricao.length > 2048) {
          throw new ErrorResponse('AnotacaoDescricao não pode exceder 2048 caracteres', 400);
        }
      }

      // Validar AnotacaoIsFeito (se fornecido)
      if (AnotacaoIsFeito !== undefined) {
        if (typeof AnotacaoIsFeito !== 'boolean') {
          throw new ErrorResponse('AnotacaoIsFeito deve ser boolean', 400);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  // Validar GUID no params
  static validarGUID(req: Request, res: Response, next: NextFunction) {
    try {
      const { guid } = req.params;

      if (!guid) {
        throw new ErrorResponse('AnotacaoGUID é obrigatório nos parâmetros', 400);
      }

      // Validar formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(guid)) {
        throw new ErrorResponse('AnotacaoGUID inválido (deve ser UUID v4)', 400);
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  // Validar query params de filtros
  static validarFiltros(req: Request, res: Response, next: NextFunction) {
    try {
      const { EscolaGUID, DataInicio, DataFim, AnotacaoIsFeito } = req.query;

      // EscolaGUID é obrigatório para listar
      if (!EscolaGUID) {
        throw new ErrorResponse('EscolaGUID é obrigatório nos parâmetros de busca', 400);
      }

      // Validar datas (se fornecidas)
      if (DataInicio) {
        const data = new Date(DataInicio as string);
        if (isNaN(data.getTime())) {
          throw new ErrorResponse('DataInicio inválida', 400);
        }
      }

      if (DataFim) {
        const data = new Date(DataFim as string);
        if (isNaN(data.getTime())) {
          throw new ErrorResponse('DataFim inválida', 400);
        }
      }

      // Validar AnotacaoIsFeito (se fornecido)
      if (AnotacaoIsFeito !== undefined) {
        const valorBoolean = AnotacaoIsFeito === 'true' || AnotacaoIsFeito === '1';
        const valorBooleanFalse = AnotacaoIsFeito === 'false' || AnotacaoIsFeito === '0';

        if (!valorBoolean && !valorBooleanFalse) {
          throw new ErrorResponse('AnotacaoIsFeito deve ser true, false, 1 ou 0', 400);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}
