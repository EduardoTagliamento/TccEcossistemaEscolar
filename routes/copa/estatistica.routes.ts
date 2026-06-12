/**
 * Rotas: Estatísticas
 */

import { Router } from "express";
import { EstatisticaController } from "../../backend/controllers/copa/estatistica.controller";

export function estatisticaRouterFactory(): Router {
  const router = Router();
  const controller = new EstatisticaController();

  // GET /album/estatisticas/geral - Estatísticas gerais
  router.get("/geral", controller.obterGeral);

  // GET /album/estatisticas/resumo - Resumo rápido
  router.get("/resumo", controller.obterResumo);

  // GET /album/estatisticas/faltantes/:albumNome - Faltantes agrupadas
  router.get("/faltantes/:albumNome", controller.obterFaltantes);

  return router;
}
