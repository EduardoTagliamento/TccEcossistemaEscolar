import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/ErrorResponse';

export class AnotacaoMiddleware {
  // Validar body de criação
  static validarCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { EscolaGUID, AnotacaoData, AnotacaoTitulo } = req.body;

      // Campos obrigatórios
      if (!EscolaGUID) {
        throw new ErrorResponse(400, 'EscolaGUID é obrigatório');
      }

      if (!AnotacaoData) {
        throw new ErrorResponse(400, 'AnotacaoData é obrigatória');
      }

      if (!AnotacaoTitulo) {
        throw new ErrorResponse(400, 'AnotacaoTitulo é obrigatório');
      }

      // Validar formato de data
      const dataObj = new Date(AnotacaoData);
      if (isNaN(dataObj.getTime())) {
        throw new ErrorResponse(400, 'AnotacaoData inválida (use formato ISO 8601)');
      }

      // Validar tamanho do título
      if (typeof AnotacaoTitulo !== 'string' || AnotacaoTitulo.trim().length === 0) {
        throw new ErrorResponse(400, 'AnotacaoTitulo não pode ser vazio');
      }

      if (AnotacaoTitulo.length > 256) {
        throw new ErrorResponse(400, 'AnotacaoTitulo não pode exceder 256 caracteres');
      }

      // Validar descrição (se fornecida)
      if (req.body.AnotacaoDescricao !== undefined) {
        if (typeof req.body.AnotacaoDescricao !== 'string') {
          throw new ErrorResponse(400, 'AnotacaoDescricao deve ser uma string');
        }

        if (req.body.AnotacaoDescricao.length > 2048) {
          throw new ErrorResponse(400, 'AnotacaoDescricao não pode exceder 2048 caracteres');
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
        throw new ErrorResponse(400, 'Nenhum campo para atualizar foi fornecido');
      }

      // Validar AnotacaoData (se fornecida)
      if (AnotacaoData !== undefined) {
        const dataObj = new Date(AnotacaoData);
        if (isNaN(dataObj.getTime())) {
          throw new ErrorResponse(400, 'AnotacaoData inválida');
        }
      }

      // Validar AnotacaoTitulo (se fornecido)
      if (AnotacaoTitulo !== undefined) {
        if (typeof AnotacaoTitulo !== 'string' || AnotacaoTitulo.trim().length === 0) {
          throw new ErrorResponse(400, 'AnotacaoTitulo não pode ser vazio');
        }

        if (AnotacaoTitulo.length > 256) {
          throw new ErrorResponse(400, 'AnotacaoTitulo não pode exceder 256 caracteres');
        }
      }

      // Validar AnotacaoDescricao (se fornecida)
      if (AnotacaoDescricao !== undefined) {
        if (AnotacaoDescricao !== null && typeof AnotacaoDescricao !== 'string') {
          throw new ErrorResponse(400, 'AnotacaoDescricao deve ser string ou null');
        }

        if (AnotacaoDescricao && AnotacaoDescricao.length > 2048) {
          throw new ErrorResponse(400, 'AnotacaoDescricao não pode exceder 2048 caracteres');
        }
      }

      // Validar AnotacaoIsFeito (se fornecido)
      if (AnotacaoIsFeito !== undefined) {
        if (typeof AnotacaoIsFeito !== 'boolean') {
          throw new ErrorResponse(400, 'AnotacaoIsFeito deve ser boolean');
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
        throw new ErrorResponse(400, 'AnotacaoGUID é obrigatório nos parâmetros');
      }

      // Validar formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(guid)) {
        throw new ErrorResponse(400, 'AnotacaoGUID inválido (deve ser UUID v4)');
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
        throw new ErrorResponse(400, 'EscolaGUID é obrigatório nos parâmetros de busca');
      }

      // Validar datas (se fornecidas)
      if (DataInicio) {
        const data = new Date(DataInicio as string);
        if (isNaN(data.getTime())) {
          throw new ErrorResponse(400, 'DataInicio inválida');
        }
      }

      if (DataFim) {
        const data = new Date(DataFim as string);
        if (isNaN(data.getTime())) {
          throw new ErrorResponse(400, 'DataFim inválida');
        }
      }

      // Validar AnotacaoIsFeito (se fornecido)
      if (AnotacaoIsFeito !== undefined) {
        const valorBoolean = AnotacaoIsFeito === 'true' || AnotacaoIsFeito === '1';
        const valorBooleanFalse = AnotacaoIsFeito === 'false' || AnotacaoIsFeito === '0';

        if (!valorBoolean && !valorBooleanFalse) {
          throw new ErrorResponse(400, 'AnotacaoIsFeito deve ser true, false, 1 ou 0');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}

