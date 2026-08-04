import rateLimit from "express-rate-limit";

export const provaRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas requisições para /api/prova. Tente novamente em instantes.",
  },
});

/**
 * Limite apertado pra rotas públicas sensíveis a força bruta/enumeração
 * (login, cadastro) — sem isso, nada impedia tentativa automatizada de senha
 * ou spam de criação de conta.
 */
export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas tentativas. Tente novamente em alguns minutos.",
  },
});
