/**
 * 🛣️  Routes - Projeto
 *
 * Define os endpoints HTTP para o módulo de Projetos.
 *
 * Rotas:
 * - POST   /api/projeto                       - Criar projeto (Professor/Direção)
 * - GET    /api/projeto?EscolaGUID=            - Listar projetos visíveis ao usuário
 * - GET    /api/projeto/:projetoGUID           - Detalhe do projeto
 * - PATCH  /api/projeto/:projetoGUID           - Atualizar projeto (só criador)
 * - PATCH  /api/projeto/:projetoGUID/encerrar  - Encerrar projeto (só criador)
 */

import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase';
import { ProjetoDAO } from '../backend/repositories/projeto.repository';
import { TurmaDAO } from '../backend/repositories/turma.repository';
import { MatriculaDAO } from '../backend/repositories/matricula.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../backend/repositories/escolaxusuarioxfuncao.repository';
import ProjetoService from '../backend/services/projeto.service';
import ProjetoController from '../backend/controllers/projeto.controller';
import ProjetoMiddleware from '../backend/middlewares/projeto.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

export function projetoRoutes(): Router {
  const router = Router();

  const database = MysqlDatabase.getInstance();
  const projetoDAO = new ProjetoDAO(database);
  const turmaDAO = new TurmaDAO(database);
  const matriculaDAO = new MatriculaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);

  const projetoService = new ProjetoService(projetoDAO, turmaDAO, matriculaDAO, escolaxUsuarioxFuncaoDAO);
  const projetoController = new ProjetoController(projetoService);
  const projetoMiddleware = new ProjetoMiddleware();

  // ==================== ROTAS ====================

  router.post(
    '/',
    AuthMiddleware.authenticate,
    projetoMiddleware.validateCreateBody,
    projetoController.criarProjeto
  );

  router.get(
    '/',
    AuthMiddleware.authenticate,
    projetoMiddleware.validateEscolaGUIDQuery,
    projetoController.listarProjetos
  );

  router.get(
    '/:projetoGUID',
    AuthMiddleware.authenticate,
    projetoMiddleware.validateProjetoGUIDParam,
    projetoController.buscarProjeto
  );

  router.patch(
    '/:projetoGUID/encerrar',
    AuthMiddleware.authenticate,
    projetoMiddleware.validateProjetoGUIDParam,
    projetoController.encerrarProjeto
  );

  router.patch(
    '/:projetoGUID',
    AuthMiddleware.authenticate,
    projetoMiddleware.validateProjetoGUIDParam,
    projetoMiddleware.validateUpdateBody,
    projetoController.atualizarProjeto
  );

  return router;
}
