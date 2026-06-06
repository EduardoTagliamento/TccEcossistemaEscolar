/**
 * Rotas: Sistema Copa do Mundo 2026
 * Agregador de todas as rotas do sistema de álbum
 */

import { Router } from "express";
import { figurinhaRouterFactory } from "./figurinha.routes";
import { albumRouterFactory } from "./album.routes";
import { estatisticaRouterFactory } from "./estatistica.routes";

export function copaRouterFactory(): Router {
  const router = Router();

  // Registrar rotas
  router.use("/figurinhas", figurinhaRouterFactory());
  router.use("/albuns", albumRouterFactory());
  router.use("/estatisticas", estatisticaRouterFactory());

  // Rota de health check
  router.get("/health", (req, res) => {
    res.json({
      sucesso: true,
      mensagem: "Sistema de Álbum da Copa 2026 funcionando! 🏆",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

export const copaRoutes = copaRouterFactory();
