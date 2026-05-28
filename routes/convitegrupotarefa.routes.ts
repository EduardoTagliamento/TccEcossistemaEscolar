/**
 * 🛣️  Routes - ConviteGrupoTarefa
 * 
 * Define os endpoints HTTP para gerenciamento de convites e solicitações de grupos.
 * 
 * Rotas:
 * - POST   /api/convitegrupotarefa/:grupoGUID/convites         - Líder envia convite
 * - POST   /api/convitegrupotarefa/:grupoGUID/solicitacoes     - Aluno solicita entrada
 * - GET    /api/convitegrupotarefa/pendentes                   - Listar pendentes
 * - PATCH  /api/convitegrupotarefa/:conviteGUID/aceitar        - Aceitar convite/solicitação
 * - PATCH  /api/convitegrupotarefa/:conviteGUID/recusar        - Recusar convite/solicitação
 */

import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase';
import { ConviteGrupoTarefaDAO } from '../backend/repositories/convitegrupotarefa.repository';
import { GrupoTarefaDAO } from '../backend/repositories/grupotarefa.repository';
import { UsuarioXGrupoTarefaDAO } from '../backend/repositories/usuarioxgrupotarefa.repository';
import { HistoricoGrupoTarefaDAO } from '../backend/repositories/historicogrupotarefa.repository';
import ConviteGrupoTarefaService from '../backend/services/convitegrupotarefa.service';
import HistoricoGrupoTarefaService from '../backend/services/historicogrupotarefa.service';
import ConviteGrupoTarefaController from '../backend/controllers/convitegrupotarefa.controller';
import ConviteGrupoTarefaMiddleware from '../backend/middlewares/convitegrupotarefa.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

/**
 * Factory de rotas de ConviteGrupoTarefa
 */
export function conviteGrupoTarefaRoutes(): Router {
  const router = Router();

  // Instanciar dependências (Injeção de Dependências)
  const database = MysqlDatabase.getInstance();
  const conviteDAO = new ConviteGrupoTarefaDAO(database);
  const grupoTarefaDAO = new GrupoTarefaDAO(database);
  const usuarioXGrupoDAO = new UsuarioXGrupoTarefaDAO(database);
  const historicoDAO = new HistoricoGrupoTarefaDAO(database);

  const historicoService = new HistoricoGrupoTarefaService(historicoDAO);
  
  const conviteService = new ConviteGrupoTarefaService(
    conviteDAO,
    grupoTarefaDAO,
    usuarioXGrupoDAO,
    historicoService,
    database
  );

  const conviteController = new ConviteGrupoTarefaController(conviteService);
  const conviteMiddleware = new ConviteGrupoTarefaMiddleware();

  // ==================== ROTAS ====================

  /**
   * POST /api/convitegrupotarefa/:grupoGUID/convites
   * Líder envia convite para aluno
   * Requer: Autenticação + Líder do grupo
   */
  router.post(
    '/:grupoGUID/convites',
    AuthMiddleware.authenticate,
    conviteMiddleware.validateGrupoGUIDParam,
    conviteMiddleware.validateEnviarConviteBody,
    conviteController.enviarConvite
  );

  /**
   * POST /api/convitegrupotarefa/:grupoGUID/solicitacoes
   * Aluno solicita entrada no grupo
   * Requer: Autenticação + Aluno deve estar sozinho
   */
  router.post(
    '/:grupoGUID/solicitacoes',
    AuthMiddleware.authenticate,
    conviteMiddleware.validateGrupoGUIDParam,
    conviteController.solicitarEntrada
  );

  /**
   * GET /api/convitegrupotarefa/pendentes
   * Listar convites e solicitações pendentes do usuário
   * Requer: Autenticação
   */
  router.get(
    '/pendentes',
    AuthMiddleware.authenticate,
    conviteController.listarPendentes
  );

  /**
   * PATCH /api/convitegrupotarefa/:conviteGUID/aceitar
   * Aceitar convite ou solicitação
   * Requer: Autenticação + Autorização (convidado ou líder)
   */
  router.patch(
    '/:conviteGUID/aceitar',
    AuthMiddleware.authenticate,
    conviteMiddleware.validateConviteGUIDParam,
    conviteController.aceitarConvite
  );

  /**
   * PATCH /api/convitegrupotarefa/:conviteGUID/recusar
   * Recusar convite ou solicitação
   * Requer: Autenticação + Autorização (convidado ou líder)
   */
  router.patch(
    '/:conviteGUID/recusar',
    AuthMiddleware.authenticate,
    conviteMiddleware.validateConviteGUIDParam,
    conviteController.recusarConvite
  );

  return router;
}
