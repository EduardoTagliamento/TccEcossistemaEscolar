import { Router } from "express";
import MatriculaController from "../backend/controllers/matricula.controller";
import MatriculaService from "../backend/services/matricula.service";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { MatriculaMiddleware } from "../backend/middlewares/matricula.middleware";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

/**
 * Factory para criar router de Matrícula com dependências injetadas
 * 
 * Padrão de roteamento:
 * 1. POST /transferir - ANTES de /:guid para evitar colisão
 * 2. POST / - criar
 * 3. GET / - listar
 * 4. GET /:guid - buscar
 * 5. PUT /:guid - atualizar
 * 6. DELETE /:guid - cancelar
 */
export function matriculaRouterFactory(): Router {
  const router = Router();

  // Inicializar dependências
  const database = new MysqlDatabase();
  const matriculaDAO = new MatriculaDAO(database);
  const turmaDAO = new TurmaDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);

  const matriculaService = new MatriculaService(
    matriculaDAO,
    turmaDAO,
    usuarioDAO,
    escolaxUsuarioxFuncaoDAO,
    database
  );

  const matriculaController = new MatriculaController(matriculaService);

  // ==================== ROTAS ====================

  /**
   * POST /api/matricula/transferir
   * Transferência transacional de aluno entre turmas
   * DEVE VIR ANTES de /:guid
   */
  router.post(
    "/transferir",
    AuthMiddleware.authenticate,
    MatriculaMiddleware.validarTransferencia,
    matriculaController.transferir
  );

  /**
   * POST /api/matricula
   * Criar nova matrícula
   */
  router.post(
    "/",
    AuthMiddleware.authenticate,
    MatriculaMiddleware.validarCriacao,
    matriculaController.store
  );

  /**
   * GET /api/matricula
   * Listar matrículas com filtros opcionais
   * Query: ?UsuarioCPF=X&TurmaGUID=Y&MatriculaStatus=Z
   */
  router.get(
    "/",
    AuthMiddleware.authenticate,
    matriculaController.index
  );

  /**
   * GET /api/matricula/:guid
   * Buscar matrícula por GUID (RA customizado ou UUID)
   */
  router.get(
    "/:guid",
    AuthMiddleware.authenticate,
    MatriculaMiddleware.validarGUID,
    matriculaController.show
  );

  /**
   * PUT /api/matricula/:guid
   * Atualizar matrícula
   */
  router.put(
    "/:guid",
    AuthMiddleware.authenticate,
    MatriculaMiddleware.validarGUID,
    MatriculaMiddleware.validarAtualizacao,
    matriculaController.update
  );

  /**
   * DELETE /api/matricula/:guid
   * Cancelar matrícula (soft delete)
   */
  router.delete(
    "/:guid",
    AuthMiddleware.authenticate,
    MatriculaMiddleware.validarGUID,
    matriculaController.destroy
  );

  return router;
}
