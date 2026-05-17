/**
 * 🔵 Controller - Pendência
 * 
 * Camada de controle HTTP para endpoints de pendência.
 * 
 * Endpoints:
 * - POST /api/pendencia - Criar pendência
 * - GET /api/pendencia - Listar pendências (com filtros)
 * - GET /api/pendencia/:PendenciaGUID - Buscar pendência por ID
 * - PUT /api/pendencia/:PendenciaGUID - Atualizar pendência
 * - DELETE /api/pendencia/:PendenciaGUID - Excluir pendência
 * - PATCH /api/pendencia/:PendenciaGUID/feito - Marcar como feito
 * - GET /api/pendencia/contador/pendentes - Contar pendentes
 * - GET /api/pendencia/contador/atrasadas - Contar atrasadas
 */

import { Request, Response, NextFunction } from "express";
import PendenciaService, { PendenciaCreateDTO, PendenciaUpdateDTO } from "../services/pendencia.service";
import { PendenciaFilters } from "../repositories/pendencia.repository";
import RelacaoAnexosService from "../services/relacaoanexos.service";
import ErrorResponse from "../utils/ErrorResponse";

export default class PendenciaController {
  #pendenciaService: PendenciaService;
  #relacaoAnexosService?: RelacaoAnexosService;

  constructor(pendenciaService: PendenciaService, relacaoAnexosService?: RelacaoAnexosService) {
    console.log("🔵 PendenciaController.constructor()");
    this.#pendenciaService = pendenciaService;
    this.#relacaoAnexosService = relacaoAnexosService;
  }

  /**
   * POST /api/pendencia
   * Criar nova pendência
   */
  store = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 PendenciaController.store()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const data: PendenciaCreateDTO = {
        UsuarioCPFDestino: req.body.UsuarioCPFDestino,
        EscolaGUID: req.body.EscolaGUID,
        PendenciaTitulo: req.body.PendenciaTitulo,
        PendenciaConteudo: req.body.PendenciaConteudo,
        PendenciaPrazoData: req.body.PendenciaPrazoData
      };

      const pendencia = await this.#pendenciaService.store(data, usuarioCPF);

      res.status(201).json({
        success: true,
        message: "Pendência criada com sucesso",
        data: {
          pendencia
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/pendencia
   * Listar pendências com filtros opcionais
   */
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 PendenciaController.index()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const filters: PendenciaFilters = {
        EscolaGUID: req.query.EscolaGUID as string,
        PendenciaFeito: req.query.PendenciaFeito === 'true' || req.query.PendenciaFeito === '1' 
          ? true 
          : req.query.PendenciaFeito === 'false' || req.query.PendenciaFeito === '0'
          ? false
          : undefined,
        atrasadas: req.query.atrasadas === 'true' || req.query.atrasadas === '1',
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      };

      const pendencias = await this.#pendenciaService.index(filters, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Pendências listadas com sucesso",
        data: {
          pendencias,
          total: pendencias.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/pendencia/:PendenciaGUID
   * Buscar pendência por ID
   */
  show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 PendenciaController.show()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const { PendenciaGUID } = req.params;

      const pendencia = await this.#pendenciaService.show(PendenciaGUID, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Pendência encontrada",
        data: {
          pendencia
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/pendencia/:PendenciaGUID
   * Atualizar pendência
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 PendenciaController.update()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const { PendenciaGUID } = req.params;

      const data: PendenciaUpdateDTO = {
        PendenciaTitulo: req.body.PendenciaTitulo,
        PendenciaConteudo: req.body.PendenciaConteudo,
        PendenciaPrazoData: req.body.PendenciaPrazoData
      };

      const pendencia = await this.#pendenciaService.update(PendenciaGUID, data, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Pendência atualizada com sucesso",
        data: {
          pendencia
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/pendencia/:PendenciaGUID
   * Excluir pendência
   */
  destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 PendenciaController.destroy()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const { PendenciaGUID } = req.params;

      await this.#pendenciaService.destroy(PendenciaGUID, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Pendência excluída com sucesso",
        data: null
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/pendencia/:PendenciaGUID/feito
   * Marcar pendência como feita
   */
  marcarComoFeito = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 PendenciaController.marcarComoFeito()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const { PendenciaGUID } = req.params;

      const pendencia = await this.#pendenciaService.marcarComoFeito(PendenciaGUID, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Pendência marcada como feita",
        data: {
          pendencia
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/pendencia/contador/pendentes
   * Contar pendências não concluídas
   */
  contarPendentes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 PendenciaController.contarPendentes()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const escolaGUID = req.query.EscolaGUID as string | undefined;

      const total = await this.#pendenciaService.contarPendentes(usuarioCPF, escolaGUID);

      res.status(200).json({
        success: true,
        message: "Total de pendências pendentes",
        data: {
          total
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/pendencia/contador/atrasadas
   * Contar pendências atrasadas
   */
  contarAtrasadas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 PendenciaController.contarAtrasadas()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      const escolaGUID = req.query.EscolaGUID as string | undefined;

      const total = await this.#pendenciaService.contarAtrasadas(usuarioCPF, escolaGUID);

      res.status(200).json({
        success: true,
        message: "Total de pendências atrasadas",
        data: {
          total
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/pendencia/:PendenciaGUID/anexos
   * Listar anexos vinculados à pendência
   */
  listarAnexos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 PendenciaController.listarAnexos()");
    try {
      if (!this.#relacaoAnexosService) {
        return next(new ErrorResponse(500, "Serviço de anexos não configurado"));
      }

      const { PendenciaGUID } = req.params;
      const usuarioCPF = req.user?.UsuarioCPF;

      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const anexos = await this.#relacaoAnexosService.listarAnexosPendencia(PendenciaGUID, usuarioCPF);

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
   * POST /api/pendencia/:PendenciaGUID/anexos
   * Vincular anexo à pendência
   */
  vincularAnexo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 PendenciaController.vincularAnexo()");
    try {
      if (!this.#relacaoAnexosService) {
        return next(new ErrorResponse(500, "Serviço de anexos não configurado"));
      }

      const { PendenciaGUID } = req.params;
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
        "pendencia",
        PendenciaGUID,
        usuarioCPF
      );

      res.status(201).json({
        success: true,
        message: "Anexo vinculado à pendência com sucesso",
        data: { relacao }
      });
    } catch (error) {
      next(error);
    }
  };
}
