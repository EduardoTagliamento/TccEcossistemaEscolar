/**
 * 🔷 Middleware - Pendência
 * 
 * Validações de requisição HTTP para endpoints de pendência.
 * 
 * Validações:
 * - Formato de GUIDs (UUID v4)
 * - Campos obrigatórios no body
 * - Tipos de dados corretos
 * - Limites de tamanho de strings
 */

import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * Classe de Middleware para Pendência
 */
export default class PendenciaMiddleware {
  /**
   * Validar GUID no parâmetro da URL
   */
  static validarGUID(req: Request, _res: Response, next: NextFunction): void {
    const { PendenciaGUID } = req.params;

    if (!PendenciaGUID) {
      return next(new ErrorResponse(400, "PendenciaGUID é obrigatório na URL"));
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(PendenciaGUID)) {
      return next(new ErrorResponse(400, "PendenciaGUID inválido (deve ser UUID v4)"));
    }

    next();
  }

  /**
   * Validar body de criação (POST)
   */
  static validarCreate(req: Request, _res: Response, next: NextFunction): void {
    const { UsuarioCPFDestino, EscolaGUID, PendenciaTitulo, PendenciaPrazoData } = req.body;

    // Validar campos obrigatórios
    if (!UsuarioCPFDestino) {
      return next(new ErrorResponse(400, "UsuarioCPFDestino é obrigatório"));
    }

    if (!EscolaGUID) {
      return next(new ErrorResponse(400, "EscolaGUID é obrigatório"));
    }

    if (!PendenciaTitulo) {
      return next(new ErrorResponse(400, "PendenciaTitulo é obrigatório"));
    }

    if (!PendenciaPrazoData) {
      return next(new ErrorResponse(400, "PendenciaPrazoData é obrigatório"));
    }

    // Validar CPF
    const cpfLimpo = UsuarioCPFDestino.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return next(new ErrorResponse(400, "UsuarioCPFDestino deve ter 11 dígitos"));
    }

    // Validar EscolaGUID (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(EscolaGUID)) {
      return next(new ErrorResponse(400, "EscolaGUID inválido (deve ser UUID v4)"));
    }

    // Validar título
    const titulo = String(PendenciaTitulo).trim();
    if (titulo.length < 3 || titulo.length > 128) {
      return next(new ErrorResponse(400, "PendenciaTitulo deve ter entre 3 e 128 caracteres"));
    }

    // Validar conteúdo (opcional)
    if (req.body.PendenciaConteudo !== undefined) {
      const conteudo = String(req.body.PendenciaConteudo).trim();
      if (conteudo.length > 1024) {
        return next(new ErrorResponse(400, "PendenciaConteudo deve ter no máximo 1024 caracteres"));
      }
    }

    // Validar data de prazo
    const prazoData = new Date(PendenciaPrazoData);
    if (isNaN(prazoData.getTime())) {
      return next(new ErrorResponse(400, "PendenciaPrazoData deve ser uma data válida (ISO 8601)"));
    }

    next();
  }

  /**
   * Validar body de atualização (PUT)
   */
  static validarUpdate(req: Request, _res: Response, next: NextFunction): void {
    const { PendenciaTitulo, PendenciaConteudo, PendenciaPrazoData } = req.body;

    // Pelo menos um campo deve ser fornecido
    if (!PendenciaTitulo && PendenciaConteudo === undefined && !PendenciaPrazoData) {
      return next(new ErrorResponse(
        400,
        "Pelo menos um campo deve ser fornecido para atualização"
      ));
    }

    // Validar título se fornecido
    if (PendenciaTitulo !== undefined) {
      const titulo = String(PendenciaTitulo).trim();
      if (titulo.length < 3 || titulo.length > 128) {
        return next(new ErrorResponse(400, "PendenciaTitulo deve ter entre 3 e 128 caracteres"));
      }
    }

    // Validar conteúdo se fornecido
    if (PendenciaConteudo !== undefined) {
      const conteudo = String(PendenciaConteudo).trim();
      if (conteudo.length > 1024) {
        return next(new ErrorResponse(400, "PendenciaConteudo deve ter no máximo 1024 caracteres"));
      }
    }

    // Validar data de prazo se fornecida
    if (PendenciaPrazoData !== undefined) {
      const prazoData = new Date(PendenciaPrazoData);
      if (isNaN(prazoData.getTime())) {
        return next(new ErrorResponse(400, "PendenciaPrazoData deve ser uma data válida (ISO 8601)"));
      }
    }

    next();
  }

  /**
   * Validar query params para listagem (GET /api/pendencia)
   */
  static validarQueryParams(req: Request, _res: Response, next: NextFunction): void {
    const { EscolaGUID, PendenciaFeito, atrasadas, limit, offset } = req.query;

    // Validar EscolaGUID se fornecido
    if (EscolaGUID) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(String(EscolaGUID))) {
        return next(new ErrorResponse(400, "EscolaGUID inválido (deve ser UUID v4)"));
      }
    }

    // Validar PendenciaFeito se fornecido
    if (PendenciaFeito !== undefined) {
      const valorBoolean = String(PendenciaFeito).toLowerCase();
      if (!['true', 'false', '1', '0'].includes(valorBoolean)) {
        return next(new ErrorResponse(400, "PendenciaFeito deve ser boolean (true/false ou 1/0)"));
      }
    }

    // Validar atrasadas se fornecido
    if (atrasadas !== undefined) {
      const valorBoolean = String(atrasadas).toLowerCase();
      if (!['true', 'false', '1', '0'].includes(valorBoolean)) {
        return next(new ErrorResponse(400, "atrasadas deve ser boolean (true/false ou 1/0)"));
      }
    }

    // Validar limit se fornecido
    if (limit !== undefined) {
      const limitNum = parseInt(String(limit), 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return next(new ErrorResponse(400, "limit deve ser um número entre 1 e 100"));
      }
    }

    // Validar offset se fornecido
    if (offset !== undefined) {
      const offsetNum = parseInt(String(offset), 10);
      if (isNaN(offsetNum) || offsetNum < 0) {
        return next(new ErrorResponse(400, "offset deve ser um número >= 0"));
      }
    }

    next();
  }

  /**
   * Validar query params para contadores (GET /api/pendencia/contador/*)
   */
  static validarQueryContador(req: Request, _res: Response, next: NextFunction): void {
    const { EscolaGUID } = req.query;

    // EscolaGUID é opcional, mas se fornecido deve ser válido
    if (EscolaGUID) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(String(EscolaGUID))) {
        return next(new ErrorResponse(400, "EscolaGUID inválido (deve ser UUID v4)"));
      }
    }

    next();
  }
}
