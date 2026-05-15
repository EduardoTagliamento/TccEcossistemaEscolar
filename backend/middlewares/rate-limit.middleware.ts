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
