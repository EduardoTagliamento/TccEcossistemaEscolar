/**
 * 🎮 Controller de Autenticação
 * 
 * Gerencia requisições relacionadas a login, logout e validação de tokens.
 */

import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth.service.js';
import ErrorResponse from '../utils/ErrorResponse.js';

interface LoginRequest {
  identifier: string; // CPF, email ou telefone
  senha: string;
}

export default class AuthController {
  #authService: AuthService;

  constructor(authService: AuthService) {
    console.log('⬆️  AuthController.constructor()');
    this.#authService = authService;
  }

  /**
   * POST /api/auth/login
   * Realiza o login do usuário
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('📥 [AuthController] POST /api/auth/login');

      const { identifier, senha } = req.body as LoginRequest;

      // Validações
      if (!identifier || !senha) {
        throw new ErrorResponse(400, 'Dados incompletos', {
          message: 'CPF/email/telefone e senha são obrigatórios',
        });
      }

      if (senha.length < 6) {
        throw new ErrorResponse(400, 'Senha inválida', {
          message: 'A senha deve ter pelo menos 6 caracteres',
        });
      }

      // Executar login
      const result = await this.#authService.login({ identifier, senha });

      res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/auth/me
   * Retorna os dados do usuário autenticado
   */
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('📥 [AuthController] GET /api/auth/me');

      // O middleware de autenticação já adiciona req.user
      if (!req.user) {
        throw new ErrorResponse(401, 'Não autenticado', {
          message: 'Você precisa estar autenticado para acessar este recurso',
        });
      }

      // Buscar dados atualizados do usuário
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];

      if (!token) {
        throw new ErrorResponse(401, 'Token não fornecido', {
          message: 'Token de autenticação não encontrado',
        });
      }

      const user = await this.#authService.validateToken(token);

      res.status(200).json({
        success: true,
        message: 'Usuário autenticado',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/logout
   * Realiza o logout do usuário (placeholder)
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('📥 [AuthController] POST /api/auth/logout');

      // Com JWT stateless, o logout é feito no frontend removendo o token
      // Aqui podemos implementar blacklist de tokens no futuro se necessário

      res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso',
        data: {
          info: 'Token removido. Por favor, remova o token do armazenamento local.',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/refresh
   * Atualiza o token do usuário (futuro)
   */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('📥 [AuthController] POST /api/auth/refresh');

      throw new ErrorResponse(501, 'Não implementado', {
        message: 'Funcionalidade de refresh token ainda não implementada',
      });
    } catch (error) {
      next(error);
    }
  };
}
