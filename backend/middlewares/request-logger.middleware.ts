import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Log estruturado de requisição HTTP — método, rota, status, duração e um
 * `requestId` (também devolvido em `X-Request-Id`) pra correlacionar uma
 * entrada de log com uma requisição específica, inclusive quando o mesmo
 * erro aparece de novo no log de erro global.
 */
export function requestLoggerMiddleware(request: Request, response: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  request.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);

  const inicio = process.hrtime.bigint();

  response.on("finish", () => {
    const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1_000_000;

    const nivel = response.statusCode >= 500 ? "error" : response.statusCode >= 400 ? "warn" : "http";

    logger.log(nivel, "http_request", {
      requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Math.round(duracaoMs * 100) / 100,
      usuarioCPF: request.user?.UsuarioCPF,
    });
  });

  next();
}
