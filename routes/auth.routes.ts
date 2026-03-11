/**
 * 🛣️  Rotas de Autenticação
 * 
 * Define os endpoints para login, logout e validação de tokens.
 */

import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase.js';
import { UsuarioDAO } from '../backend/repositories/usuario.repository.js';
import AuthService from '../backend/services/auth.service.js';
import AuthController from '../backend/controllers/auth.controller.js';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware.js';

// Instanciar dependências
const database = new MysqlDatabase();
const usuarioDAO = new UsuarioDAO(database);
const authService = new AuthService(usuarioDAO);
const authController = new AuthController(authService);

// Criar router
const authRoutes = Router();

/**
 * @route POST /api/auth/login
 * @description Realiza login com CPF/email/telefone e senha
 * @access Public
 * @body { identifier: string, senha: string }
 * @returns { token: string, user: {...} }
 */
authRoutes.post('/login', authController.login);

/**
 * @route GET /api/auth/me
 * @description Retorna dados do usuário autenticado
 * @access Private (requer token)
 * @headers Authorization: Bearer {token}
 * @returns { user: {...} }
 */
authRoutes.get('/me', AuthMiddleware.authenticate, authController.me);

/**
 * @route POST /api/auth/logout
 * @description Realiza logout do usuário
 * @access Private (requer token)
 * @headers Authorization: Bearer {token}
 * @returns { message: string }
 */
authRoutes.post('/logout', AuthMiddleware.authenticate, authController.logout);

/**
 * @route POST /api/auth/refresh
 * @description Atualiza o token do usuário (futuro)
 * @access Private (requer token)
 * @headers Authorization: Bearer {token}
 * @returns { token: string }
 */
authRoutes.post('/refresh', AuthMiddleware.authenticate, authController.refresh);

export default authRoutes;
