import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { RedefinicaoSenhaDAO } from "../backend/repositories/redefinicao-senha.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import RedefinicaoSenhaService from "../backend/services/redefinicao-senha.service";
import RedefinicaoSenhaController from "../backend/controllers/redefinicao-senha.controller";
import RedefinicaoSenhaMiddleware from "../backend/middlewares/redefinicao-senha.middleware";
import { authRateLimitMiddleware } from "../backend/middlewares/rate-limit.middleware";

// Dependency Injection
const database = new MysqlDatabase();
const redefinicaoDAO = new RedefinicaoSenhaDAO(database);
const usuarioDAO = new UsuarioDAO(database);
const redefinicaoService = new RedefinicaoSenhaService(redefinicaoDAO, usuarioDAO);
const redefinicaoController = new RedefinicaoSenhaController(redefinicaoService);
const redefinicaoMiddleware = new RedefinicaoSenhaMiddleware();

const redefinicaoSenhaRoutes = Router();

/**
 * @route   POST /api/redefinicao-senha/solicitar
 * @desc    Solicita link de redefinição de senha por e-mail — sempre
 *          responde com a mesma mensagem genérica, exista ou não conta
 *          com o e-mail informado (evita enumeração de usuários)
 * @access  Public
 */
redefinicaoSenhaRoutes.post(
  "/solicitar",
  authRateLimitMiddleware,
  redefinicaoMiddleware.validateSolicitarBody,
  redefinicaoController.solicitar
);

/**
 * @route   POST /api/redefinicao-senha/redefinir
 * @desc    Redefine a senha a partir do token recebido por e-mail
 * @access  Public
 */
redefinicaoSenhaRoutes.post(
  "/redefinir",
  authRateLimitMiddleware,
  redefinicaoMiddleware.validateRedefinirBody,
  redefinicaoController.redefinir
);

export default redefinicaoSenhaRoutes;
