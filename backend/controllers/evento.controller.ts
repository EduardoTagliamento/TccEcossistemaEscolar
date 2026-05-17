/**
 * 🔵 Controller - Evento
 * 
 * Camada de controle HTTP para endpoints de evento.
 * 
 * Endpoints:
 * - POST /api/evento - Criar evento
 * - GET /api/evento - Listar eventos (com filtros)
 * - GET /api/evento/:EventoGUID - Buscar evento por ID
 * - PUT /api/evento/:EventoGUID - Atualizar evento
 * - DELETE /api/evento/:EventoGUID - Excluir evento (soft delete)
 */

import { Request, Response, NextFunction } from "express";
import EventoService, { EventoCreateDTO, EventoUpdateDTO } from "../services/evento.service";
import { EventoFilters } from "../repositories/evento.repository";
import RelacaoAnexosService from "../services/relacaoanexos.service";
import ErrorResponse from "../utils/ErrorResponse";

export default class EventoController {
  #eventoService: EventoService;
  #relacaoAnexosService?: RelacaoAnexosService;

  constructor(eventoService: EventoService, relacaoAnexosService?: RelacaoAnexosService) {
    console.log("🔵 EventoController.constructor()");
    this.#eventoService = eventoService;
    this.#relacaoAnexosService = relacaoAnexosService;
  }

  /**
   * POST /api/evento
   * Criar novo evento
   */
  store = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 EventoController.store()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const data: EventoCreateDTO = {
        EscolaGUID: req.body.EscolaGUID,
        EventoTitulo: req.body.EventoTitulo,
        EventoDescricao: req.body.EventoDescricao,
        EventoData: req.body.EventoData
      };

      const evento = await this.#eventoService.store(data, usuarioCPF);

      res.status(201).json({
        success: true,
        message: "Evento criado com sucesso",
        data: {
          evento
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/evento
   * Listar eventos com filtros opcionais
   */
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 EventoController.index()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const filters: EventoFilters = {
        EscolaGUID: req.query.EscolaGUID as string,
        EventoStatus: req.query.EventoStatus as any,
        dataInicio: req.query.dataInicio ? new Date(req.query.dataInicio as string) : undefined,
        dataFim: req.query.dataFim ? new Date(req.query.dataFim as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      };

      const eventos = await this.#eventoService.index(filters, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Eventos listados com sucesso",
        data: {
          eventos,
          total: eventos.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/evento/:EventoGUID
   * Buscar evento por ID
   */
  show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 EventoController.show()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const { EventoGUID } = req.params;

      const evento = await this.#eventoService.show(EventoGUID, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Evento encontrado",
        data: {
          evento
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/evento/:EventoGUID
   * Atualizar evento
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 EventoController.update()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const { EventoGUID } = req.params;

      const data: EventoUpdateDTO = {
        EventoTitulo: req.body.EventoTitulo,
        EventoDescricao: req.body.EventoDescricao,
        EventoData: req.body.EventoData,
        EventoStatus: req.body.EventoStatus
      };

      const evento = await this.#eventoService.update(EventoGUID, data, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Evento atualizado com sucesso",
        data: {
          evento
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/evento/:EventoGUID
   * Excluir evento (soft delete)
   */
  destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 EventoController.destroy()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const { EventoGUID } = req.params;

      await this.#eventoService.destroy(EventoGUID, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Evento cancelado com sucesso",
        data: null
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/evento/:EventoGUID/anexos
   * Listar anexos vinculados ao evento
   */
  listarAnexos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 EventoController.listarAnexos()");
    try {
      if (!this.#relacaoAnexosService) {
        return next(new ErrorResponse(500, "Serviço de anexos não configurado"));
      }

      const { EventoGUID } = req.params;
      const usuarioCPF = req.user?.UsuarioCPF;

      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const anexos = await this.#relacaoAnexosService.listarAnexosEvento(EventoGUID, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Anexos listados com sucesso",
        data: {
          anexos,
          total: anexos.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/evento/:EventoGUID/anexos
   * Vincular anexo ao evento
   */
  vincularAnexo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 EventoController.vincularAnexo()");
    try {
      if (!this.#relacaoAnexosService) {
        return next(new ErrorResponse(500, "Serviço de anexos não configurado"));
      }

      const { EventoGUID } = req.params;
      const { AnexoGUID } = req.body;
      const usuarioCPF = req.user?.UsuarioCPF;

      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      if (!AnexoGUID) {
        return next(new ErrorResponse(400, "AnexoGUID é obrigatório"));
      }

      const relacao = await this.#relacaoAnexosService.vincularAnexo(
        AnexoGUID,
        "evento",
        EventoGUID,
        usuarioCPF
      );

      res.status(201).json({
        success: true,
        message: "Anexo vinculado ao evento com sucesso",
        data: { relacao }
      });
    } catch (error) {
      next(error);
    }
  };
}
