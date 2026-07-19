/**
 * 🛣️  Routes - GrupoProjeto
 *
 * Define os endpoints HTTP para gerenciamento de grupos de projeto.
 *
 * Rotas:
 * - POST   /api/grupoprojeto                            - Criar grupo (aluno)
 * - GET    /api/grupoprojeto/projeto/:projetoGUID        - Listar grupos de um projeto
 * - GET    /api/grupoprojeto/:grupoGUID                  - Buscar grupo específico
 * - PATCH  /api/grupoprojeto/:grupoGUID                  - Atualizar grupo (só líder)
 * - PATCH  /api/grupoprojeto/:grupoGUID/pontuacao        - Atribuir pontuação (só criador do projeto)
 * - POST   /api/grupoprojeto/:grupoGUID/entrar           - Entrar diretamente (só se Aberto)
 * - DELETE /api/grupoprojeto/:grupoGUID/sair             - Sair do próprio grupo
 * - DELETE /api/grupoprojeto/:grupoGUID/membros/:cpf     - Expulsar membro (líder ou criador do projeto)
 * - POST   /api/grupoprojeto/:grupoGUID/membros          - Adicionar membro direto (só criador do projeto)
 * - PATCH  /api/grupoprojeto/:grupoGUID/transferir-lider - Transferir liderança (só líder)
 */

import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase';
import { GrupoProjetoDAO } from '../backend/repositories/grupoprojeto.repository';
import { UsuarioXGrupoProjetoDAO } from '../backend/repositories/usuarioxgrupoprojeto.repository';
import { ProjetoDAO } from '../backend/repositories/projeto.repository';
import { HistoricoGrupoProjetoDAO } from '../backend/repositories/historicogrupoprojeto.repository';
import GrupoProjetoService from '../backend/services/grupoprojeto.service';
import HistoricoGrupoProjetoService from '../backend/services/historicogrupoprojeto.service';
import GrupoProjetoController from '../backend/controllers/grupoprojeto.controller';
import GrupoProjetoMiddleware from '../backend/middlewares/grupoprojeto.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

export function grupoProjetoRoutes(): Router {
  const router = Router();

  const database = MysqlDatabase.getInstance();
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

  const grupoProjetoController = new GrupoProjetoController(grupoProjetoService);
  const grupoProjetoMiddleware = new GrupoProjetoMiddleware();

  // ==================== ROTAS ====================

  router.post(
    '/',
    AuthMiddleware.authenticate,
    grupoProjetoMiddleware.validateCreateGrupoBody,
    grupoProjetoController.criarGrupo
  );

  router.get(
    '/projeto/:projetoGUID',
    AuthMiddleware.authenticate,
    grupoProjetoMiddleware.validateProjetoGUIDParam,
    grupoProjetoController.listarGruposDoProjeto
  );

  router.get(
    '/:grupoGUID',
    AuthMiddleware.authenticate,
    grupoProjetoMiddleware.validateGrupoGUIDParam,
    grupoProjetoController.buscarGrupo
  );

  router.patch(
    '/:grupoGUID/pontuacao',
    AuthMiddleware.authenticate,
    grupoProjetoMiddleware.validateGrupoGUIDParam,
    grupoProjetoMiddleware.validatePontuacaoBody,
    grupoProjetoController.atualizarPontuacao
  );

  router.patch(
    '/:grupoGUID/transferir-lider',
    AuthMiddleware.authenticate,
    grupoProjetoMiddleware.validateGrupoGUIDParam,
    grupoProjetoMiddleware.validateTransferirLiderBody,
    grupoProjetoController.transferirLideranca
  );

  router.patch(
    '/:grupoGUID',
    AuthMiddleware.authenticate,
    grupoProjetoMiddleware.validateGrupoGUIDParam,
    grupoProjetoMiddleware.validateUpdateGrupoBody,
    grupoProjetoController.atualizarGrupo
  );

  router.post(
    '/:grupoGUID/entrar',
    AuthMiddleware.authenticate,
    grupoProjetoMiddleware.validateGrupoGUIDParam,
    grupoProjetoController.entrarGrupo
  );

  router.delete(
    '/:grupoGUID/sair',
    AuthMiddleware.authenticate,
    grupoProjetoMiddleware.validateGrupoGUIDParam,
    grupoProjetoController.sairGrupo
  );

  router.post(
    '/:grupoGUID/membros',
    AuthMiddleware.authenticate,
    grupoProjetoMiddleware.validateGrupoGUIDParam,
    grupoProjetoMiddleware.validateAdicionarMembroBody,
    grupoProjetoController.adicionarMembro
  );

  router.delete(
    '/:grupoGUID/membros/:cpf',
    AuthMiddleware.authenticate,
    grupoProjetoMiddleware.validateGrupoAndMembroParams,
    grupoProjetoController.expulsarMembro
  );

  return router;
}
