/**
 * 🔒 Middleware de Autenticação
 * 
 * Verifica se o usuário está autenticado através do token JWT.
 * Adiciona os dados do usuário no objeto Request para uso nos controllers.
 */

import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../utils/JwtService';
import ErrorResponse from '../utils/ErrorResponse';
import ApiKeyAuthMiddleware from './apikey-auth.middleware';

// Extender o tipo Request do Express para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        UsuarioGUID: string;
        UsuarioEmail: string;
        UsuarioNome: string;
      };
    }
  }
}

export class AuthMiddleware {
  /**
   * Verifica se o token JWT é válido
   */
  static authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // 1. Obter token do header Authorization
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new ErrorResponse(401, 'Token não fornecido', {
          message: 'Você precisa estar autenticado para acessar este recurso',
        });
      }

      // 2. Extrair token (formato: "Bearer TOKEN")
      const parts = authHeader.split(' ');

      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new ErrorResponse(401, 'Token mal formatado', {
          message: 'O token deve estar no formato: Bearer {token}',
        });
      }

      const token = parts[1];

      if (!token || token.trim() === '') {
        throw new ErrorResponse(401, 'Token vazio', {
          message: 'O token não pode estar vazio',
        });
      }

      // 2.5. Chave de API de parceiro externo (prefixo `baua_`) segue um
      // fluxo de autenticação totalmente diferente (hash lookup, sem JWT) —
      // ver backend/middlewares/apikey-auth.middleware.ts.
      if (ApiKeyAuthMiddleware.ehTokenDeApiKey(token)) {
        ApiKeyAuthMiddleware.authenticate(req, res, next);
        return;
      }

      // 3. Verificar e decodificar token
      const decoded = JwtService.verifyToken(token);

      // 4. Adicionar dados do usuário ao request
      req.user = {
        UsuarioGUID: decoded.UsuarioGUID,
        UsuarioEmail: decoded.UsuarioEmail,
        UsuarioNome: decoded.UsuarioNome,
      };

      console.log(`✅ [Auth] Usuário autenticado: ${decoded.UsuarioNome}`);

      next();
    } catch (error: any) {
      if (error instanceof ErrorResponse) {
        next(error);
      } else {
        next(
          new ErrorResponse(401, 'Token inválido', {
            message: error.message || 'Falha na autenticação',
          })
        );
      }
    }
  };

  /**
   * Middleware opcional - não bloqueia se não estiver autenticado
   */
  static optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        next();
        return;
      }

      const parts = authHeader.split(' ');

      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];

        // Chave de API: usa a variante leniente própria (nunca bloqueia,
        // igual o resto deste método) — ver apikey-auth.middleware.ts.
        if (ApiKeyAuthMiddleware.ehTokenDeApiKey(token)) {
          ApiKeyAuthMiddleware.authenticateOpcional(req, res, next);
          return;
        }

        const decoded = JwtService.verifyToken(token);

        req.user = {
          UsuarioGUID: decoded.UsuarioGUID,
          UsuarioEmail: decoded.UsuarioEmail,
          UsuarioNome: decoded.UsuarioNome,
        };
      }

      next();
    } catch (error) {
      // Ignora erros e continua sem autenticação
      next();
    }
  };
}
