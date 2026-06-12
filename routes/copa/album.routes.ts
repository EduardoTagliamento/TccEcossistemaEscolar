/**
 * Rotas: Álbuns
 */

import { Router } from "express";
import { AlbumController } from "../../backend/controllers/copa/album.controller";

export function albumRouterFactory(): Router {
  const router = Router();
  const controller = new AlbumController();

  // GET /album/albuns - Listar todos os álbuns
  router.get("/", controller.listarTodos);

  // GET /album/albuns/:id - Buscar álbum por ID
  router.get("/:id", controller.buscarPorId);

  // GET /album/albuns/:id/figurinhas - Buscar todas as figurinhas com status
  router.get("/:id/figurinhas", controller.buscarFigurinhas);

  // GET /album/albuns/:id/faltantes - Buscar figurinhas faltantes
  router.get("/:id/faltantes", controller.buscarFaltantes);

  // GET /album/albuns/:id/completas - Buscar figurinhas completas
  router.get("/:id/completas", controller.buscarCompletas);

  // GET /album/albuns/:id/estatisticas - Obter estatísticas do álbum
  router.get("/:id/estatisticas", controller.obterEstatisticas);

  // PUT /album/albuns/:id/figurinhas/:figurinhaId - Atualizar status
  router.put("/:id/figurinhas/:figurinhaId", controller.atualizarStatus);

  return router;
}
