/**
 * 🔷 Middleware - Evento
 * 
 * Validações de requisição HTTP para endpoints de evento.
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
 * Classe de Middleware para Evento
 */
export default class EventoMiddleware {
  /**
   * Validar GUID no parâmetro da URL
   */
  static validarGUID(req: Request, _res: Response, next: NextFunction): void {
    const { EventoGUID } = req.params;

    if (!EventoGUID) {
      return next(new ErrorResponse(400, "EventoGUID é obrigatório na URL"));
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(EventoGUID)) {
      return next(new ErrorResponse(400, "EventoGUID inválido (deve ser UUID v4)"));
    }

    next();
  }

  /**
   * Validar body de criação (POST)
   */
  static validarCreate(req: Request, _res: Response, next: NextFunction): void {
    const { EscolaGUID, EventoTitulo, EventoData } = req.body;

    // Validar campos obrigatórios
    if (!EscolaGUID) {
      return next(new ErrorResponse(400, "EscolaGUID é obrigatório"));
    }

    if (!EventoTitulo) {
      return next(new ErrorResponse(400, "EventoTitulo é obrigatório"));
    }

    if (!EventoData) {
      return next(new ErrorResponse(400, "EventoData é obrigatório"));
    }

    // Validar EscolaGUID (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(EscolaGUID)) {
      return next(new ErrorResponse(400, "EscolaGUID inválido (deve ser UUID v4)"));
    }

    // Validar título
    const titulo = String(EventoTitulo).trim();
    if (titulo.length < 3 || titulo.length > 128) {
      return next(new ErrorResponse(400, "EventoTitulo deve ter entre 3 e 128 caracteres"));
    }

    // Validar descrição (opcional)
    if (req.body.EventoDescricao !== undefined) {
      const descricao = String(req.body.EventoDescricao).trim();
      if (descricao.length > 1024) {
        return next(new ErrorResponse(400, "EventoDescricao deve ter no máximo 1024 caracteres"));
      }
    }

    // Validar data
    const eventoData = new Date(EventoData);
    if (isNaN(eventoData.getTime())) {
      return next(new ErrorResponse(400, "EventoData deve ser uma data válida (ISO 8601)"));
    }

    next();
  }

  /**
   * Validar body de atualização (PUT)
   */
  static validarUpdate(req: Request, _res: Response, next: NextFunction): void {
    const { EventoTitulo, EventoDescricao, EventoData, EventoStatus } = req.body;

    // Pelo menos um campo deve ser fornecido
    if (
      !EventoTitulo &&
      EventoDescricao === undefined &&
      !EventoData &&
      !EventoStatus
    ) {
      return next(
        new ErrorResponse(400, "Pelo menos um campo deve ser fornecido para atualização")
      );
    }

    // Validar título se fornecido
    if (EventoTitulo !== undefined) {
      const titulo = String(EventoTitulo).trim();
      if (titulo.length < 3 || titulo.length > 128) {
        return next(new ErrorResponse(400, "EventoTitulo deve ter entre 3 e 128 caracteres"));
      }
    }

    // Validar descrição se fornecida
    if (EventoDescricao !== undefined) {
      const descricao = String(EventoDescricao).trim();
      if (descricao.length > 1024) {
        return next(new ErrorResponse(400, "EventoDescricao deve ter no máximo 1024 caracteres"));
      }
    }

    // Validar data se fornecida
    if (EventoData !== undefined) {
      const eventoData = new Date(EventoData);
      if (isNaN(eventoData.getTime())) {
        return next(new ErrorResponse(400, "EventoData deve ser uma data válida (ISO 8601)"));
      }
    }

    // Validar status se fornecido
    if (EventoStatus !== undefined) {
      const statusValidos = ["Agendado", "Realizado", "Cancelado"];
      if (!statusValidos.includes(EventoStatus)) {
        return next(new ErrorResponse(400, "EventoStatus deve ser Agendado, Realizado ou Cancelado"));
      }
    }

    next();
  }

  /**
   * Validar query params para listagem (GET /api/evento)
   */
  static validarQueryParams(req: Request, _res: Response, next: NextFunction): void {
    const { EscolaGUID, EventoStatus, dataInicio, dataFim, limit, offset } = req.query;

    // Validar EscolaGUID se fornecido
    if (EscolaGUID) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(String(EscolaGUID))) {
        return next(new ErrorResponse(400, "EscolaGUID inválido (deve ser UUID v4)"));
      }
    }

    // Validar EventoStatus se fornecido
    if (EventoStatus) {
      const statusValidos = ["Agendado", "Realizado", "Cancelado"];
      if (!statusValidos.includes(String(EventoStatus))) {
        return next(new ErrorResponse(400, "EventoStatus deve ser Agendado, Realizado ou Cancelado"));
      }
    }

    // Validar dataInicio se fornecida
    if (dataInicio) {
      const data = new Date(String(dataInicio));
      if (isNaN(data.getTime())) {
        return next(new ErrorResponse(400, "dataInicio deve ser uma data válida (ISO 8601)"));
      }
    }

    // Validar dataFim se fornecida
    if (dataFim) {
      const data = new Date(String(dataFim));
      if (isNaN(data.getTime())) {
        return next(new ErrorResponse(400, "dataFim deve ser uma data válida (ISO 8601)"));
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
}
