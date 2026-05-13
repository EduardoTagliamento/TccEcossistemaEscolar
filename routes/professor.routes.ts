import { Router } from "express";
import ProfessorController from "../backend/controllers/professor.controller";
import ProfessorService from "../backend/services/professor.service";
import { MaterialProfessorTurmaDAO } from "../backend/repositories/materiaxprofessorxturma.repository";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { ProfessorMiddleware } from "../backend/middlewares/professor.middleware";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

/**
 * Factory para criar router de Professor com dependências injetadas
 * 
 * Conceito:
 * - Professor = Usuário com FuncaoId=3
 * - Alocação = Tabela de junção materiaxprofessorxturma
 * 
 * Padrão de roteamento:
 * 1. GET / - listar professores da escola (query: EscolaGUID)
 * 2. GET /:cpf/escolas/:escolaGUID/alocacoes - buscar alocações do professor
 * 3. POST /alocacao - criar alocação
 * 4. GET /alocacao - listar alocações
 * 5. GET /alocacao/:guid - buscar alocação
 * 6. PUT /alocacao/:guid - atualizar alocação
 * 7. DELETE /alocacao/:guid - excluir alocação
 */
export function professorRouterFactory(): Router {
  const router = Router();

  // Inicializar dependências
  const database = new MysqlDatabase();
  const alocacaoDAO = new MaterialProfessorTurmaDAO(database);
  const materiaDAO = new MateriaDAO(database);
  const turmaDAO = new TurmaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);

  const professorService = new ProfessorService(
    alocacaoDAO,
    materiaDAO,
    turmaDAO,
    escolaxUsuarioxFuncaoDAO
  );

  const professorController = new ProfessorController(professorService);

  // ==================== ROTAS ====================

  /**
   * GET /api/professor?EscolaGUID=X
   * Listar professores de uma escola
   */
  router.get(
    "/",
    AuthMiddleware.authenticate,
    ProfessorMiddleware.validarListagemProfessores,
    professorController.listarProfessores
  );

  /**
   * GET /api/professor/:cpf/escolas/:escolaGUID/alocacoes
   * Buscar alocações de um professor em uma escola
   */
  router.get(
    "/:cpf/escolas/:escolaGUID/alocacoes",
    AuthMiddleware.authenticate,
    ProfessorMiddleware.validarBuscarAlocacoesProfessor,
    professorController.buscarAlocacoesProfessor
  );

  /**
   * POST /api/professor/alocacao
   * Criar alocação (vincular professor a matéria+turma)
   */
  router.post(
    "/alocacao",
    AuthMiddleware.authenticate,
    ProfessorMiddleware.validarCriacaoAlocacao,
    professorController.criarAlocacao
  );

  /**
   * GET /api/professor/alocacao
   * Listar alocações com filtros opcionais
   * Query: ?MateriaGUID=X&TurmaGUID=Y&UsuarioCPF=Z&AlocacaoStatus=W
   */
  router.get(
    "/alocacao",
    AuthMiddleware.authenticate,
    professorController.listarAlocacoes
  );

  /**
   * GET /api/professor/alocacao/:guid
   * Buscar alocação por GUID
   */
  router.get(
    "/alocacao/:guid",
    AuthMiddleware.authenticate,
    ProfessorMiddleware.validarGUID,
    professorController.buscarAlocacao
  );

  /**
   * PUT /api/professor/alocacao/:guid
   * Atualizar alocação (apenas status)
   */
  router.put(
    "/alocacao/:guid",
    AuthMiddleware.authenticate,
    ProfessorMiddleware.validarGUID,
    ProfessorMiddleware.validarAtualizacaoAlocacao,
    professorController.atualizarAlocacao
  );

  /**
   * DELETE /api/professor/alocacao/:guid
   * Excluir alocação (soft delete)
   */
  router.delete(
    "/alocacao/:guid",
    AuthMiddleware.authenticate,
    ProfessorMiddleware.validarGUID,
    professorController.excluirAlocacao
  );

  return router;
}
