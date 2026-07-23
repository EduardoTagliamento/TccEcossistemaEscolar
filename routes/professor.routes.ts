import { Router } from "express";
import ProfessorController from "../backend/controllers/professor.controller";
import ProfessorService from "../backend/services/professor.service";
import { MaterialProfessorTurmaDAO } from "../backend/repositories/materiaxprofessorxturma.repository";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { MateriaCustomizacaoDAO } from "../backend/repositories/materiacustomizacao.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
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
 * 1. POST / - criar professores (individual ou massa)
 * 2. GET / - listar professores da escola (query: EscolaGUID)
 * 3. GET /:cpf/escolas/:escolaGUID/alocacoes - buscar alocações do professor
 * 4. POST /alocacao - criar alocação (individual ou massa)
 * 5. GET /alocacao - listar alocações
 * 6. GET /alocacao/:guid - buscar alocação
 * 7. PUT /alocacao/:guid - atualizar alocação
 * 8. DELETE /alocacao/:guid - excluir alocação
 */
export function professorRouterFactory(): Router {
  const router = Router();

  // Inicializar dependências
  const database = new MysqlDatabase();
  const alocacaoDAO = new MaterialProfessorTurmaDAO(database);
  const materiaDAO = new MateriaDAO(database);
  const turmaDAO = new TurmaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const matriculaDAO = new MatriculaDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const customizacaoDAO = new MateriaCustomizacaoDAO(database);
  const escolaDAO = new EscolaDAO(database);

  const professorService = new ProfessorService(
    alocacaoDAO,
    materiaDAO,
    turmaDAO,
    escolaxUsuarioxFuncaoDAO,
    matriculaDAO,
    usuarioDAO,
    customizacaoDAO,
    escolaDAO
  );

  const professorController = new ProfessorController(professorService);

  // ==================== ROTAS ====================

  /**
   * POST /api/professor
   * Criar professores (individual ou em massa)
   */
  router.post(
    "/",
    AuthMiddleware.authenticate,
    professorController.criarProfessores
  );

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

  /**
   * GET /api/professor/materias?EscolaGUID=X
   * Buscar matérias que o professor logado leciona
   */
  router.get(
    "/materias",
    AuthMiddleware.authenticate,
    professorController.buscarMateriasProfessor
  );

  /**
   * GET /api/professor/materias-com-capa?EscolaGUID=X
   */
  router.get(
    "/materias-com-capa",
    AuthMiddleware.authenticate,
    professorController.buscarMateriasComCapa
  );

  /**
   * GET /api/professor/turmas-com-capa?MateriaGUID=X
   */
  router.get(
    "/turmas-com-capa",
    AuthMiddleware.authenticate,
    professorController.buscarTurmasComCapa
  );

  /**
   * GET /api/professor/turmas-alunos?MatProfTurGUID=X
   * Buscar estrutura hierárquica de turmas e alunos
   */
  router.get(
    "/turmas-alunos",
    AuthMiddleware.authenticate,
    professorController.buscarTurmasAlunos
  );

  return router;
}
