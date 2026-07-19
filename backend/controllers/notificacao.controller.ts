/**
 * 🔔 Controller - Notificacao
 *
 * Camada de controle HTTP para o feed de notificações e preferências do
 * usuário logado (ver docs/routes/notificacao-api.md).
 *
 * Endpoints:
 * - GET   /api/notificacao                              - Listar notificações do usuário
 * - GET   /api/notificacao/contador                      - Contar não lidas
 * - PATCH /api/notificacao/:NotificacaoGUID/lida          - Marcar uma como lida
 * - PATCH /api/notificacao/lidas                          - Marcar todas como lidas
 * - GET   /api/notificacao/tipos                          - Catálogo de tipos
 * - GET   /api/notificacao/preferencias                   - Preferências efetivas do usuário
 * - PUT   /api/notificacao/preferencias/:NotificacaoTipoId - Atualizar preferência
 */

import { Request, Response, NextFunction } from "express";
import NotificacaoService from "../services/notificacao.service";
import ErrorResponse from "../utils/ErrorResponse";

export default class NotificacaoController {
  #notificacaoService: NotificacaoService;

  constructor(notificacaoService: NotificacaoService) {
    console.log("🔵 NotificacaoController.constructor()");
    this.#notificacaoService = notificacaoService;
  }

  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 NotificacaoController.index()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const lidaParam = req.query.lida;
      const filters = {
        lida: lidaParam === "true" ? true : lidaParam === "false" ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      const notificacoes = await this.#notificacaoService.listar(usuarioCPF, filters);

      res.status(200).json({
        success: true,
        message: "Notificações listadas com sucesso",
        data: { notificacoes, total: notificacoes.length },
      });
    } catch (error) {
      next(error);
    }
  };

  contador = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 NotificacaoController.contador()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const total = await this.#notificacaoService.contarNaoLidas(usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Total de notificações não lidas",
        data: { total },
      });
    } catch (error) {
      next(error);
    }
  };

  marcarComoLida = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 NotificacaoController.marcarComoLida()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const { NotificacaoGUID } = req.params;
      const notificacao = await this.#notificacaoService.marcarComoLida(NotificacaoGUID, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Notificação marcada como lida",
        data: { notificacao },
      });
    } catch (error) {
      next(error);
    }
  };

  marcarTodasComoLidas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 NotificacaoController.marcarTodasComoLidas()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const total = await this.#notificacaoService.marcarTodasComoLidas(usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Notificações marcadas como lidas",
        data: { total },
      });
    } catch (error) {
      next(error);
    }
  };

  tipos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 NotificacaoController.tipos()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const tipos = await this.#notificacaoService.listarTipos();

      res.status(200).json({
        success: true,
        message: "Catálogo de tipos de notificação",
        data: { tipos },
      });
    } catch (error) {
      next(error);
    }
  };

  preferencias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 NotificacaoController.preferencias()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const preferencias = await this.#notificacaoService.listarPreferencias(usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Preferências de notificação do usuário",
        data: { preferencias },
      });
    } catch (error) {
      next(error);
    }
  };

  atualizarPreferencia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 NotificacaoController.atualizarPreferencia()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const notificacaoTipoId = parseInt(req.params.NotificacaoTipoId, 10);
      if (!Number.isInteger(notificacaoTipoId)) {
        return next(new ErrorResponse(400, "NotificacaoTipoId inválido"));
      }

      const { PreferenciaEmailAtivo, PreferenciaWhatsappAtivo } = req.body;
      if (typeof PreferenciaEmailAtivo !== "boolean" || typeof PreferenciaWhatsappAtivo !== "boolean") {
        return next(new ErrorResponse(400, "PreferenciaEmailAtivo e PreferenciaWhatsappAtivo são obrigatórios e devem ser booleanos"));
      }

      const preferencia = await this.#notificacaoService.atualizarPreferencia(
        usuarioCPF,
        notificacaoTipoId,
        PreferenciaEmailAtivo,
        PreferenciaWhatsappAtivo
      );

      res.status(200).json({
        success: true,
        message: "Preferência atualizada com sucesso",
        data: { preferencia },
      });
    } catch (error) {
      next(error);
    }
  };
}
