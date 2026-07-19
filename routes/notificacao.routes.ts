/**
 * 🛣️  Routes - Notificação
 *
 * Define os endpoints HTTP do sistema de notificações.
 *
 * Rotas:
 * - GET   /api/notificacao                              - Listar notificações do usuário
 * - GET   /api/notificacao/contador                      - Contar não lidas
 * - GET   /api/notificacao/tipos                          - Catálogo de tipos
 * - GET   /api/notificacao/preferencias                   - Preferências efetivas do usuário
 * - PUT   /api/notificacao/preferencias/:NotificacaoTipoId - Atualizar preferência
 * - PATCH /api/notificacao/lidas                          - Marcar todas como lidas
 * - PATCH /api/notificacao/:NotificacaoGUID/lida           - Marcar uma como lida
 */

import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { NotificacaoDAO } from "../backend/repositories/notificacao.repository";
import { NotificacaoTipoDAO } from "../backend/repositories/notificacaotipo.repository";
import { UsuarioNotificacaoPreferenciaDAO } from "../backend/repositories/usuarionotificacaopreferencia.repository";
import { NotificacaoEnvioDAO } from "../backend/repositories/notificacaoenvio.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import NotificacaoService from "../backend/services/notificacao.service";
import NotificacaoController from "../backend/controllers/notificacao.controller";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

export function notificacaoRoutes(): Router {
  const router = Router();

  const database = new MysqlDatabase();
  const notificacaoDAO = new NotificacaoDAO(database);
  const tipoDAO = new NotificacaoTipoDAO(database);
  const preferenciaDAO = new UsuarioNotificacaoPreferenciaDAO(database);
  const envioDAO = new NotificacaoEnvioDAO(database);
  const usuarioDAO = new UsuarioDAO(database);

  const notificacaoService = new NotificacaoService(
    notificacaoDAO,
    tipoDAO,
    preferenciaDAO,
    envioDAO,
    usuarioDAO
  );

  const controller = new NotificacaoController(notificacaoService);

  router.use(AuthMiddleware.authenticate);

  router.get("/tipos", controller.tipos);
  router.get("/preferencias", controller.preferencias);
  router.put("/preferencias/:NotificacaoTipoId", controller.atualizarPreferencia);
  router.get("/contador", controller.contador);
  router.patch("/lidas", controller.marcarTodasComoLidas);
  router.patch("/:NotificacaoGUID/lida", controller.marcarComoLida);
  router.get("/", controller.index);

  return router;
}
