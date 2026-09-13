/**
 * 🔵 Controller - ApiKey
 *
 * Endpoints:
 * - POST   /api/api-key                 - Emitir chave (Direção)
 * - GET    /api/api-key?EscolaGUID=     - Listar chaves da escola (Direção)
 * - DELETE /api/api-key/:ApiKeyGUID     - Revogar chave (Direção)
 */

import { Request, Response, NextFunction } from "express";
import ApiKeyService, { ApiKeyCreateDTO } from "../services/apikey.service";

export default class ApiKeyController {
  #apiKeyService: ApiKeyService;

  constructor(apiKeyService: ApiKeyService) {
    console.log("🔵 ApiKeyController.constructor()");
    this.#apiKeyService = apiKeyService;
  }

  /**
   * POST /api/api-key
   * Emitir nova chave — o corpo da resposta traz o segredo completo UMA
   * ÚNICA VEZ, em `data.chave`.
   */
  store = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 ApiKeyController.store()");

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: "Não autenticado" });
        return;
      }

      const data: ApiKeyCreateDTO = {
        EscolaGUID: req.body.EscolaGUID,
        ApiKeyNome: req.body.ApiKeyNome,
        ApiKeyEscopos: req.body.ApiKeyEscopos,
      };

      const resultado = await this.#apiKeyService.store(data, usuarioGUID);

      res.status(201).json({
        success: true,
        message: "Chave de API criada com sucesso. Copie o valor abaixo agora — ele não será mostrado novamente.",
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/api-key?EscolaGUID=
   * Listar chaves da escola (mascaradas — nunca o segredo).
   */
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 ApiKeyController.index()");

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: "Não autenticado" });
        return;
      }

      const escolaGUID = req.query.EscolaGUID as string;
      const chaves = await this.#apiKeyService.index(escolaGUID, usuarioGUID);

      res.status(200).json({
        success: true,
        message: "Chaves de API listadas com sucesso",
        data: { chaves, total: chaves.length },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/api-key/:ApiKeyGUID
   * Revogar chave (soft delete).
   */
  destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 ApiKeyController.destroy()");

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: "Não autenticado" });
        return;
      }

      const { ApiKeyGUID } = req.params;
      await this.#apiKeyService.destroy(ApiKeyGUID, usuarioGUID);

      res.status(200).json({
        success: true,
        message: "Chave de API revogada com sucesso",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
}
