import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { VerificacaoEmailDAO } from "../backend/repositories/verificacao-email.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import VerificacaoEmailService from "../backend/services/verificacao-email.service";
import VerificacaoEmailController from "../backend/controllers/verificacao-email.controller";
import VerificacaoEmailMiddleware from "../backend/middlewares/verificacao-email.middleware";

// Dependency Injection
const database = new MysqlDatabase();
const verificacaoDAO = new VerificacaoEmailDAO(database);
const usuarioDAO = new UsuarioDAO(database);
const verificacaoService = new VerificacaoEmailService(verificacaoDAO, usuarioDAO);
const verificacaoController = new VerificacaoEmailController(verificacaoService);
const verificacaoMiddleware = new VerificacaoEmailMiddleware();

// Router
const verificacaoEmailRoutes = Router();

/**
 * @route   POST /api/verificacao-email/solicitar/:UsuarioCPF
 * @desc    Solicita código de verificação por email
 * @access  Public (usuário deve estar logado para ter CPF)
 */
verificacaoEmailRoutes.post(
  "/solicitar/:UsuarioCPF",
  verificacaoMiddleware.validateCpfParam,
  verificacaoController.solicitarCodigo
);

/**
 * @route   POST /api/verificacao-email/validar
 * @desc    Valida código de verificação
 * @access  Public
 */
verificacaoEmailRoutes.post(
  "/validar",
  verificacaoMiddleware.validateCodigoBody,
  verificacaoController.validarCodigo
);

/**
 * @route   POST /api/verificacao-email/reenviar/:UsuarioCPF
 * @desc    Reenvia código de verificação
 * @access  Public (usuário deve estar logado para ter CPF)
 */
verificacaoEmailRoutes.post(
  "/reenviar/:UsuarioCPF",
  verificacaoMiddleware.validateCpfParam,
  verificacaoController.reenviarCodigo
);

/**
 * @route   POST /api/verificacao-email/reenviar
 * @desc    Reenvia código de verificação via body (UsuarioCPF ou email)
 * @access  Public
 */
verificacaoEmailRoutes.post(
  "/reenviar",
  verificacaoMiddleware.validateReenviarBody,
  verificacaoController.reenviarCodigoBody
);

export default verificacaoEmailRoutes;
