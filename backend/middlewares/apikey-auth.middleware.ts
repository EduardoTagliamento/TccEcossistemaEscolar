/**
 * 🔒 Middleware de Autenticação por Chave de API
 *
 * Contraparte de `AuthMiddleware` (JWT) pra chamadas de parceiros externos.
 * `AuthMiddleware.authenticate` detecta o prefixo `baua_` no token e delega
 * pra cá — ver backend/middlewares/auth.middleware.ts.
 *
 * Diferente de um usuário logado, uma chave NÃO tem papel (FuncaoId): o
 * acesso dela é limitado pelos escopos gravados na criação
 * (`ApiKeyEscopos`), verificados rota a rota via `exigirEscopo`. Uma rota
 * que não chama `exigirEscopo` simplesmente não aceita chave de API na
 * prática — os controllers já existentes checam `req.user?.UsuarioGUID` e
 * devolvem 401 quando ausente, e uma chave nunca popula `req.user`.
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import MysqlDatabase from "../database/MysqlDatabase";
import { ApiKeyDAO } from "../repositories/apikey.repository";
import { ApiKeyEscopo } from "../entities/apikey.model";
import { apiKeyRateLimitMiddleware } from "./rate-limit.middleware";
import ErrorResponse from "../utils/ErrorResponse";

declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        ApiKeyGUID: string;
        EscolaGUID: string;
        Escopos: ApiKeyEscopo[];
      };
    }
  }
}

const apiKeyDAO = new ApiKeyDAO(MysqlDatabase.getInstance());

export default class ApiKeyAuthMiddleware {
  /** Reconhece um token de chave de API por formato — nunca por tentativa/erro no JWT. */
  static ehTokenDeApiKey(token: string): boolean {
    return token.startsWith("baua_");
  }

  static authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const parts = (authHeader ?? "").split(" ");
      const token = parts.length === 2 && parts[0] === "Bearer" ? parts[1] : "";

      if (!token) {
        throw new ErrorResponse(401, "Token mal formatado", {
          message: "O token deve estar no formato: Bearer {token}",
        });
      }

      const hash = crypto.createHash("sha256").update(token).digest("hex");
      const apiKey = await apiKeyDAO.findByHash(hash);

      if (!apiKey) {
        throw new ErrorResponse(401, "Chave de API inválida", {
          message: "Essa chave não existe ou foi digitada incorretamente.",
        });
      }

      if (apiKey.ApiKeyStatus !== "Ativa") {
        throw new ErrorResponse(401, "Chave de API revogada", {
          message: "Essa chave foi revogada e não pode mais ser usada.",
        });
      }

      req.apiKey = {
        ApiKeyGUID: apiKey.ApiKeyGUID,
        EscolaGUID: apiKey.EscolaGUID,
        Escopos: apiKey.ApiKeyEscopos,
      };

      // Fire-and-forget: nunca atrasa nem derruba a requisição do parceiro.
      apiKeyDAO.touchUltimoUso(apiKey.ApiKeyGUID).catch((error) => {
        console.error("🔴 ApiKeyAuthMiddleware: falha ao atualizar ApiKeyUltimoUsoEm:", error);
      });

      console.log(`✅ [ApiKeyAuth] Chave autenticada: ${apiKey.ApiKeyPrefixo}...`);

      apiKeyRateLimitMiddleware(req, res, next);
    } catch (error: any) {
      if (error instanceof ErrorResponse) {
        next(error);
      } else {
        next(new ErrorResponse(401, "Falha na autenticação por chave de API", { message: error.message }));
      }
    }
  };

  /**
   * Variante LENIENTE de `authenticate` — nunca bloqueia. Pra rotas que
   * hoje são públicas/sem autenticação nenhuma (ex.: `GET /api/usuario`,
   * histórico, aberta por nome só) e não podem virar 401 pra quem já
   * chamava sem token. Se o header trouxer uma chave de API válida,
   * `req.apiKey` é populado (permitindo o controller aplicar um filtro
   * mais estrito); qualquer coisa que dê errado — sem header, chave
   * inexistente, revogada — só segue como estava, sem token nenhum.
   */
  static authenticateOpcional = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const parts = (authHeader ?? "").split(" ");
      const token = parts.length === 2 && parts[0] === "Bearer" ? parts[1] : "";

      if (!token || !ApiKeyAuthMiddleware.ehTokenDeApiKey(token)) {
        next();
        return;
      }

      const hash = crypto.createHash("sha256").update(token).digest("hex");
      const apiKey = await apiKeyDAO.findByHash(hash);

      if (!apiKey || apiKey.ApiKeyStatus !== "Ativa") {
        next();
        return;
      }

      req.apiKey = {
        ApiKeyGUID: apiKey.ApiKeyGUID,
        EscolaGUID: apiKey.EscolaGUID,
        Escopos: apiKey.ApiKeyEscopos,
      };

      apiKeyDAO.touchUltimoUso(apiKey.ApiKeyGUID).catch((error) => {
        console.error("🔴 ApiKeyAuthMiddleware: falha ao atualizar ApiKeyUltimoUsoEm:", error);
      });

      console.log(`✅ [ApiKeyAuth] Chave autenticada (opcional): ${apiKey.ApiKeyPrefixo}...`);

      apiKeyRateLimitMiddleware(req, res, next);
    } catch (error) {
      // Leniente de propósito — qualquer falha aqui vira "seguiu sem token".
      console.error("🔴 ApiKeyAuthMiddleware.authenticateOpcional() falhou (não propagado):", error);
      next();
    }
  };

  /**
   * Gate de escopo LENIENTE — variante de `exigirEscopo` pra rotas usadas
   * com `authenticateOpcional`. Sem `req.apiKey` (anônimo OU humano),
   * segue sem checar nada — o comportamento de sempre dessas rotas
   * continua intacto. Só bloqueia quando UMA CHAVE está presente mas sem o
   * escopo necessário.
   */
  static exigirEscopoSeChave(...escoposNecessarios: ApiKeyEscopo[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.apiKey) {
        next();
        return;
      }

      const temAlgumEscopo = escoposNecessarios.some((escopo) => req.apiKey!.Escopos.includes(escopo));
      if (!temAlgumEscopo) {
        next(
          new ErrorResponse(403, "Escopo insuficiente", {
            message: `Esta chave de API não tem nenhum dos escopos necessários: ${escoposNecessarios.join(", ")}.`,
          })
        );
        return;
      }

      next();
    };
  }

  /**
   * Gate de escopo pra rotas que aceitam AMBOS humano (JWT) e chave de API.
   * Um humano autenticado passa direto (o controle de acesso dele já é
   * feito pelo papel/vínculo na escola, na camada de service, como sempre
   * foi) — este gate só existe pra restringir o que uma CHAVE pode fazer.
   */
  static exigirEscopo(...escoposNecessarios: ApiKeyEscopo[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      if (req.user) {
        next();
        return;
      }

      if (!req.apiKey) {
        next(new ErrorResponse(401, "Não autenticado"));
        return;
      }

      const temAlgumEscopo = escoposNecessarios.some((escopo) => req.apiKey!.Escopos.includes(escopo));
      if (!temAlgumEscopo) {
        next(
          new ErrorResponse(403, "Escopo insuficiente", {
            message: `Esta chave de API não tem nenhum dos escopos necessários: ${escoposNecessarios.join(", ")}.`,
          })
        );
        return;
      }

      next();
    };
  }
}
