/**
 * Rotas: Figurinhas
 */

import { Router } from "express";
import { FigurinhaController } from "../../backend/controllers/copa/figurinha.controller";

export function figurinhaRouterFactory(): Router {
  const router = Router();
  const controller = new FigurinhaController();

  // GET /album/figurinhas - Listar todas (com filtros opcionais)
  router.get("/", controller.listarTodas);

  // GET /album/figurinhas/prefixos - Listar prefixos únicos
  router.get("/prefixos", controller.listarPrefixos);

  // GET /album/figurinhas/grupos - Listar grupos únicos
  router.get("/grupos", controller.listarGrupos);

  // GET /album/figurinhas/codigo/:codigo - Buscar por código
  router.get("/codigo/:codigo", controller.buscarPorCodigo);

  // GET /album/figurinhas/prefixo/:prefixo - Buscar por prefixo
  router.get("/prefixo/:prefixo", controller.buscarPorPrefixo);

  // GET /album/figurinhas/:id - Buscar por ID
  router.get("/:id", controller.buscarPorId);

  return router;
}
