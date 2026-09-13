/**
 * 🛣️  Routes - ApiKey
 *
 * Rotas:
 * - POST   /api/api-key                  - Emitir chave (Direção)
 * - GET    /api/api-key?EscolaGUID=      - Listar chaves da escola (Direção)
 * - DELETE /api/api-key/:ApiKeyGUID      - Revogar chave (Direção)
 *
 * Todas exigem sessão humana (JWT) — emitir/revogar chave de API não é uma
 * operação que uma chave de API pode fazer em si mesma.
 */

import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { ApiKeyDAO } from "../backend/repositories/apikey.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import ApiKeyService from "../backend/services/apikey.service";
import ApiKeyController from "../backend/controllers/apikey.controller";
import ApiKeyMiddleware from "../backend/middlewares/apikey.middleware";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { escritaSensivelRateLimitMiddleware } from "../backend/middlewares/rate-limit.middleware";

export function apiKeyRoutes(): Router {
  const router = Router();

  const database = new MysqlDatabase();
  const apiKeyDAO = new ApiKeyDAO(database);
  const escolaDAO = new EscolaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);

  const apiKeyService = new ApiKeyService(apiKeyDAO, escolaDAO, escolaxUsuarioxFuncaoDAO);
  const apiKeyController = new ApiKeyController(apiKeyService);

  router.use(AuthMiddleware.authenticate);

  /**
   * POST /api/api-key
   * Emitir chave — Direção da escola.
   */
  router.post(
    "/",
    ApiKeyMiddleware.validarCreate,
    escritaSensivelRateLimitMiddleware,
    apiKeyController.store
  );

  /**
   * GET /api/api-key?EscolaGUID=
   * Listar chaves da escola — Direção.
   */
  router.get("/", ApiKeyMiddleware.validarQueryParams, apiKeyController.index);

  /**
   * DELETE /api/api-key/:ApiKeyGUID
   * Revogar chave — Direção.
   */
  router.delete(
    "/:ApiKeyGUID",
    ApiKeyMiddleware.validarGUID,
    escritaSensivelRateLimitMiddleware,
    apiKeyController.destroy
  );

  return router;
}
