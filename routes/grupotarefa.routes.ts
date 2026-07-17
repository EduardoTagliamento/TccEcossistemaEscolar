/**
 * 🛣️  Routes - GrupoTarefa
 * 
 * Define os endpoints HTTP para gerenciamento de grupos de tarefas compartilhadas.
 * 
 * Rotas:
 * - GET    /api/grupotarefa/:tarefaGUID                       - Listar grupos de uma tarefa
 * - GET    /api/grupotarefa/grupo/:grupoGUID                  - Buscar grupo específico
 * - PATCH  /api/grupotarefa/:grupoGUID/nome                   - Atualizar nome do grupo
 * - DELETE /api/grupotarefa/:grupoGUID/membros/:cpf           - Expulsar membro
 * - PATCH  /api/grupotarefa/:grupoGUID/transferir-lider       - Transferir liderança
 */

import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase';
import { GrupoTarefaDAO } from '../backend/repositories/grupotarefa.repository';
import { UsuarioXGrupoTarefaDAO } from '../backend/repositories/usuarioxgrupotarefa.repository';
import { TarefaAcademicaDAO } from '../backend/repositories/tarefaacademica.repository';
import { MatriculaDAO } from '../backend/repositories/matricula.repository';
import { TarefaAcademicaMatriculaDAO } from '../backend/repositories/tarefaacademica-matricula.repository';
import { HistoricoGrupoTarefaDAO } from '../backend/repositories/historicogrupotarefa.repository';
import { ConversaDAO } from '../backend/repositories/conversa.repository';
import { ConversaGrupoDAO } from '../backend/repositories/conversa-grupo.repository';
import GrupoTarefaService from '../backend/services/grupotarefa.service';
import HistoricoGrupoTarefaService from '../backend/services/historicogrupotarefa.service';
import ConversaGrupoService from '../backend/services/conversa-grupo.service';
import GrupoTarefaController from '../backend/controllers/grupotarefa.controller';
import GrupoTarefaMiddleware from '../backend/middlewares/grupotarefa.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

/**
 * Factory de rotas de GrupoTarefa
 */
export function grupoTarefaRoutes(): Router {
  const router = Router();

  // Instanciar dependências (Injeção de Dependências)
  const database = MysqlDatabase.getInstance();
  const grupoTarefaDAO = new GrupoTarefaDAO(database);
  const usuarioXGrupoDAO = new UsuarioXGrupoTarefaDAO(database);
  const tarefaDAO = new TarefaAcademicaDAO(database);
  const matriculaDAO = new MatriculaDAO(database);
  const tarefaMatriculaDAO = new TarefaAcademicaMatriculaDAO(database);
  const historicoDAO = new HistoricoGrupoTarefaDAO(database);

  const conversaDAO = new ConversaDAO(database);
  const conversaGrupoDAO = new ConversaGrupoDAO(database);

  const historicoService = new HistoricoGrupoTarefaService(historicoDAO);
  const conversaGrupoService = new ConversaGrupoService(conversaDAO, conversaGrupoDAO, matriculaDAO);

  const grupoTarefaService = new GrupoTarefaService(
    grupoTarefaDAO,
    usuarioXGrupoDAO,
    tarefaDAO,
    matriculaDAO,
    tarefaMatriculaDAO,
    historicoService,
    database,
    conversaGrupoService
  );

  const grupoTarefaController = new GrupoTarefaController(grupoTarefaService);
  const grupoTarefaMiddleware = new GrupoTarefaMiddleware();

  // ==================== ROTAS ====================

  /**
   * GET /api/grupotarefa/:tarefaGUID
   * Listar todos os grupos de uma tarefa
   * Requer: Autenticação
   */
  router.get(
    '/:tarefaGUID',
    AuthMiddleware.authenticate,
    grupoTarefaMiddleware.validateTarefaGUIDParam,
    grupoTarefaController.listarGruposDaTarefa
  );

  /**
   * GET /api/grupotarefa/grupo/:grupoGUID
   * Buscar grupo específico com lista de membros
   * Requer: Autenticação + Membro do grupo
   */
  router.get(
    '/grupo/:grupoGUID',
    AuthMiddleware.authenticate,
    grupoTarefaMiddleware.validateGrupoGUIDParam,
    grupoTarefaController.buscarGrupo
  );

  /**
   * PATCH /api/grupotarefa/:grupoGUID/nome
   * Atualizar nome do grupo
   * Requer: Autenticação + Líder do grupo
   */
  router.patch(
    '/:grupoGUID/nome',
    AuthMiddleware.authenticate,
    grupoTarefaMiddleware.validateGrupoGUIDParam,
    grupoTarefaMiddleware.validateNomeGrupoBody,
    grupoTarefaController.atualizarNomeGrupo
  );

  /**
   * DELETE /api/grupotarefa/:grupoGUID/membros/:cpf
   * Expulsar membro do grupo
   * Requer: Autenticação + Líder do grupo
   */
  router.delete(
    '/:grupoGUID/membros/:cpf',
    AuthMiddleware.authenticate,
    grupoTarefaMiddleware.validateGrupoAndMembroParams,
    grupoTarefaController.expulsarMembro
  );

  /**
   * PATCH /api/grupotarefa/:grupoGUID/transferir-lider
   * Transferir liderança para outro membro
   * Requer: Autenticação + Líder atual do grupo
   */
  router.patch(
    '/:grupoGUID/transferir-lider',
    AuthMiddleware.authenticate,
    grupoTarefaMiddleware.validateGrupoGUIDParam,
    grupoTarefaMiddleware.validateTransferirLiderBody,
    grupoTarefaController.transferirLideranca
  );

  return router;
}
