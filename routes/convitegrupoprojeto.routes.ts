/**
 * 🛣️  Routes - ConviteGrupoProjeto
 *
 * Define os endpoints HTTP para o fluxo de entrada em grupos de projeto
 * fechados (convite líder→aluno, solicitação aluno→grupo).
 *
 * Rotas:
 * - POST  /api/convitegrupoprojeto/:grupoGUID/convites     - Líder envia convite
 * - POST  /api/convitegrupoprojeto/:grupoGUID/solicitacoes - Aluno solicita entrada
 * - GET   /api/convitegrupoprojeto/pendentes                - Listar pendentes
 * - PATCH /api/convitegrupoprojeto/:conviteGUID/aceitar      - Aceitar
 * - PATCH /api/convitegrupoprojeto/:conviteGUID/recusar      - Recusar
 */

import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase';
import { ConviteGrupoProjetoDAO } from '../backend/repositories/convitegrupoprojeto.repository';
import { GrupoProjetoDAO } from '../backend/repositories/grupoprojeto.repository';
import { UsuarioXGrupoProjetoDAO } from '../backend/repositories/usuarioxgrupoprojeto.repository';
import { ProjetoDAO } from '../backend/repositories/projeto.repository';
import { HistoricoGrupoProjetoDAO } from '../backend/repositories/historicogrupoprojeto.repository';
import HistoricoGrupoProjetoService from '../backend/services/historicogrupoprojeto.service';
import GrupoProjetoService from '../backend/services/grupoprojeto.service';
import ConviteGrupoProjetoService from '../backend/services/convitegrupoprojeto.service';
import ConviteGrupoProjetoController from '../backend/controllers/convitegrupoprojeto.controller';
import ConviteGrupoProjetoMiddleware from '../backend/middlewares/convitegrupoprojeto.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

export function conviteGrupoProjetoRoutes(): Router {
  const router = Router();

  const database = MysqlDatabase.getInstance();
  const conviteDAO = new ConviteGrupoProjetoDAO(database);
  const grupoProjetoDAO = new GrupoProjetoDAO(database);
  const usuarioXGrupoDAO = new UsuarioXGrupoProjetoDAO(database);
  const projetoDAO = new ProjetoDAO(database);
  const historicoDAO = new HistoricoGrupoProjetoDAO(database);

  const historicoService = new HistoricoGrupoProjetoService(historicoDAO);
  const grupoProjetoService = new GrupoProjetoService(
    grupoProjetoDAO,
    usuarioXGrupoDAO,
    projetoDAO,
    historicoService,
    database
  );

  const conviteService = new ConviteGrupoProjetoService(
    conviteDAO,
    grupoProjetoDAO,
    usuarioXGrupoDAO,
    projetoDAO,
    historicoService,
    grupoProjetoService,
    database
  );

  const conviteController = new ConviteGrupoProjetoController(conviteService);
  const conviteMiddleware = new ConviteGrupoProjetoMiddleware();

  // ==================== ROTAS ====================

  router.post(
    '/:grupoGUID/convites',
    AuthMiddleware.authenticate,
    conviteMiddleware.validateGrupoGUIDParam,
    conviteMiddleware.validateEnviarConviteBody,
    conviteController.enviarConvite
  );

  router.post(
    '/:grupoGUID/solicitacoes',
    AuthMiddleware.authenticate,
    conviteMiddleware.validateGrupoGUIDParam,
    conviteController.solicitarEntrada
  );

  router.get(
    '/pendentes',
    AuthMiddleware.authenticate,
    conviteController.listarPendentes
  );

  router.patch(
    '/:conviteGUID/aceitar',
    AuthMiddleware.authenticate,
    conviteMiddleware.validateConviteGUIDParam,
    conviteController.aceitarConvite
  );

  router.patch(
    '/:conviteGUID/recusar',
    AuthMiddleware.authenticate,
    conviteMiddleware.validateConviteGUIDParam,
    conviteController.recusarConvite
  );

  return router;
}
