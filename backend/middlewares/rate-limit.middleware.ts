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

/**
 * Upload (logo, foto de perfil, anexo de mensagem) já exige autenticação,
 * mas nada limitava quantos uploads um usuário autenticado podia disparar —
 * cada um custa I/O de disco/rede + armazenamento no R2, superfície real de
 * abuso (esgotar armazenamento/banda) mesmo sem burlar a autenticação.
 */
export const uploadRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitos uploads em pouco tempo. Tente novamente em alguns minutos.",
  },
});

/**
 * Escrita em rotas de admin de plataforma (materiaglobal, questaobanco) e em
 * endpoints de escrita abertos a qualquer autenticado mas sem outro limite
 * natural (ex.: sugestão) — defesa em profundidade: essas rotas já exigem
 * autenticação (e a maioria também a flag de admin de plataforma), isso aqui
 * é só um teto pra automação/abuso, não a única camada de proteção.
 */
export const escritaSensivelRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas requisições em pouco tempo. Tente novamente em alguns minutos.",
  },
});
