import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import TarefaAcademicaControl from "../backend/controllers/tarefaacademica.controller";
import TarefaAcademicaMiddleware from "../backend/middlewares/tarefaacademica.middleware";
import TarefaAcademicaService from "../backend/services/tarefaacademica.service";
import { TarefaAcademicaDAO } from "../backend/repositories/tarefaacademica.repository";
import { TarefaAcademicaMatriculaDAO } from "../backend/repositories/tarefaacademica-matricula.repository";
import { AnexoDAO } from "../backend/repositories/anexo.repository";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";
import { EventoDAO } from "../backend/repositories/evento.repository";
import { PendenciaDAO } from "../backend/repositories/pendencia.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { RelacaoAnexosDAO } from "../backend/repositories/relacaoanexos.repository";
import RelacaoAnexosService from "../backend/services/relacaoanexos.service";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { CategoriaConteudoDAO } from "../backend/repositories/categoriaconteudo.repository";
import { MaterialProfessorTurmaDAO } from "../backend/repositories/materiaxprofessorxturma.repository";
import { TarefaAcademicaQuestaoDAO } from "../backend/repositories/tarefaacademica-questao.repository";
import { TarefaAcademicaAlternativaDAO } from "../backend/repositories/tarefaacademica-alternativa.repository";
import { TarefaAcademicaRespostaDAO } from "../backend/repositories/tarefaacademica-resposta.repository";

export default class TarefaAcademicaRoteador {
  #router: Router;
  #controle: TarefaAcademicaControl;
  #middleware: TarefaAcademicaMiddleware;

  constructor(middleware: TarefaAcademicaMiddleware, controle: TarefaAcademicaControl) {
    console.log("⬆️ TarefaAcademicaRoteador.constructor()");
    this.#router = Router();
    this.#middleware = middleware;
    this.#controle = controle;
  }

  createRoutes = (): Router => {
    console.log("⬆️ TarefaAcademicaRoteador.createRoutes()");

    // POST /api/tarefa/batch - Criar múltiplas tarefas (DEVE vir ANTES de "/" para evitar conflito)
    this.#router.post(
      "/batch",
      AuthMiddleware.authenticate,
      this.#middleware.validateBatchCreateBody,
      this.#controle.storeBatch
    );

    // POST /api/tarefa - Criar tarefa
    this.#router.post(
      "/",
      AuthMiddleware.authenticate,
      this.#middleware.validateCreateBody,
      this.#controle.store
    );

    // GET /api/tarefa - Listar tarefas (com filtros opcionais)
    this.#router.get(
      "/",
      AuthMiddleware.authenticate,
      this.#middleware.validateFilters,
      this.#controle.index
    );

    // PATCH /api/tarefa/matricula/:TarefaMatriculaGUID/avaliar - Professor avalia entrega (DEVE vir antes de "/:TarefaGUID")
    this.#router.patch(
      "/matricula/:TarefaMatriculaGUID/avaliar",
      AuthMiddleware.authenticate,
      this.#controle.avaliar
    );

    // PATCH /api/tarefa/respostas/:RespostaGUID/avaliar - Professor corrige questão discursiva (lista) (DEVE vir antes de "/:TarefaGUID")
    this.#router.patch(
      "/respostas/:RespostaGUID/avaliar",
      AuthMiddleware.authenticate,
      this.#middleware.validateRespostaIdParam,
      this.#middleware.validateAvaliarQuestaoBody,
      this.#controle.avaliarQuestaoDiscursiva
    );

    // GET /api/tarefa/pendentes-aluno?UsuarioCPF= (DEVE vir antes de "/:TarefaGUID")
    this.#router.get(
      "/pendentes-aluno",
      AuthMiddleware.authenticate,
      this.#controle.pendentesAluno
    );

    // GET /api/tarefa/pendentes-avaliacao-professor?UsuarioCPF= (DEVE vir antes de "/:TarefaGUID")
    this.#router.get(
      "/pendentes-avaliacao-professor",
      AuthMiddleware.authenticate,
      this.#controle.pendentesAvaliacaoProfessor
    );

    // GET /api/tarefa/:TarefaGUID - Buscar tarefa por GUID
    this.#router.get(
      "/:TarefaGUID",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#controle.show
    );

    // PUT /api/tarefa/:TarefaGUID - Atualizar tarefa
    this.#router.put(
      "/:TarefaGUID",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#middleware.validateUpdateBody,
      this.#controle.update
    );

    // PATCH /api/tarefa/:TarefaGUID/marcar-feito - Aluno marca tarefa como feita
    this.#router.patch(
      "/:TarefaGUID/marcar-feito",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#middleware.validateMarcarFeitoBody,
      this.#controle.marcarComoFeito
    );

    // DELETE /api/tarefa/:TarefaGUID - Excluir tarefa
    this.#router.delete(
      "/:TarefaGUID",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#controle.destroy
    );

    // POST /api/tarefa/:TarefaGUID/anexo-entrega - Vincular anexo de entrega
    this.#router.post(
      "/:TarefaGUID/anexo-entrega",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#middleware.validateAnexoEntregaBody,
      this.#controle.enviarAnexoEntrega
    );

    // DELETE /api/tarefa/:TarefaGUID/anexo-entrega/:AnexoGUID - Remover vínculo de anexo
    this.#router.delete(
      "/:TarefaGUID/anexo-entrega/:AnexoGUID",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParamWithAnexo,
      this.#controle.removerAnexo
    );

    // GET /api/tarefa/:TarefaGUID/anexos - Listar anexos (materiais de apoio)
    this.#router.get(
      "/:TarefaGUID/anexos",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#controle.listarAnexos
    );

    // POST /api/tarefa/:TarefaGUID/anexos - Vincular anexo (material de apoio)
    this.#router.post(
      "/:TarefaGUID/anexos",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#controle.vincularAnexo
    );

    // ========== Questão de tarefa "lista" ==========
    // Rotas /questoes/... e /respostas/... DEVEM vir antes de "/:TarefaGUID" pra não conflitar.

    // POST /api/tarefa/:TarefaGUID/questoes/batch - Criar N questões de uma vez
    this.#router.post(
      "/:TarefaGUID/questoes/batch",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#middleware.validateQuestoesBatchBody,
      this.#controle.criarQuestoesBatch
    );

    // POST /api/tarefa/:TarefaGUID/questoes/importar - Importar questões via planilha
    this.#router.post(
      "/:TarefaGUID/questoes/importar",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#middleware.validateImportarQuestoesBody,
      this.#controle.importarQuestoesPlanilha
    );

    // PATCH /api/tarefa/:TarefaGUID/questoes/reordenar - Reordenar questões
    this.#router.patch(
      "/:TarefaGUID/questoes/reordenar",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#middleware.validateReordenarQuestoesBody,
      this.#controle.reordenarQuestoes
    );

    // POST /api/tarefa/:TarefaGUID/questoes - Criar uma questão
    this.#router.post(
      "/:TarefaGUID/questoes",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#middleware.validateQuestaoCreateBody,
      this.#controle.criarQuestao
    );

    // GET /api/tarefa/:TarefaGUID/questoes/minhas-respostas - Visão do aluno (DEVE vir antes de "/:TarefaGUID/questoes")
    this.#router.get(
      "/:TarefaGUID/questoes/minhas-respostas",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#controle.buscarQuestoesComRespostas
    );

    // POST /api/tarefa/:TarefaGUID/questoes/:QuestaoGUID/responder-objetiva
    this.#router.post(
      "/:TarefaGUID/questoes/:QuestaoGUID/responder-objetiva",
      AuthMiddleware.authenticate,
      this.#middleware.validateTarefaEQuestaoIdParam,
      this.#middleware.validateResponderObjetivaBody,
      this.#controle.responderObjetiva
    );

    // POST /api/tarefa/:TarefaGUID/questoes/:QuestaoGUID/responder-discursiva
    this.#router.post(
      "/:TarefaGUID/questoes/:QuestaoGUID/responder-discursiva",
      AuthMiddleware.authenticate,
      this.#middleware.validateTarefaEQuestaoIdParam,
      this.#middleware.validateResponderDiscursivaBody,
      this.#controle.responderDiscursiva
    );

    // GET /api/tarefa/:TarefaGUID/questoes/matricula/:TarefaMatriculaGUID - Painel de correção do professor (DEVE vir antes de "/:TarefaGUID/questoes")
    this.#router.get(
      "/:TarefaGUID/questoes/matricula/:TarefaMatriculaGUID",
      AuthMiddleware.authenticate,
      this.#middleware.validateTarefaEMatriculaIdParam,
      this.#controle.buscarRespostasAluno
    );

    // GET /api/tarefa/:TarefaGUID/questoes - Listar questões (professor)
    this.#router.get(
      "/:TarefaGUID/questoes",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#controle.listarQuestoes
    );

    // PUT /api/tarefa/questoes/:QuestaoGUID - Atualizar questão
    this.#router.put(
      "/questoes/:QuestaoGUID",
      AuthMiddleware.authenticate,
      this.#middleware.validateQuestaoIdParam,
      this.#middleware.validateQuestaoUpdateBody,
      this.#controle.atualizarQuestao
    );

    // DELETE /api/tarefa/questoes/:QuestaoGUID - Excluir questão
    this.#router.delete(
      "/questoes/:QuestaoGUID",
      AuthMiddleware.authenticate,
      this.#middleware.validateQuestaoIdParam,
      this.#controle.excluirQuestao
    );

    // POST /api/tarefa/questoes/:QuestaoGUID/anexos - Vincular anexo à questão
    this.#router.post(
      "/questoes/:QuestaoGUID/anexos",
      AuthMiddleware.authenticate,
      this.#middleware.validateQuestaoIdParam,
      this.#middleware.validateAnexoQuestaoBody,
      this.#controle.vincularAnexoQuestao
    );

    // DELETE /api/tarefa/questoes/:QuestaoGUID/anexos/:AnexoGUID - Desvincular anexo da questão
    this.#router.delete(
      "/questoes/:QuestaoGUID/anexos/:AnexoGUID",
      AuthMiddleware.authenticate,
      this.#middleware.validateQuestaoIdParam,
      this.#controle.desvincularAnexoQuestao
    );

    return this.#router;
  };
}

// ========== Instanciação e Injeção de Dependências ==========
const db = MysqlDatabase.getInstance();
const tarefaDAO = new TarefaAcademicaDAO(db);
const tarefaMatriculaDAO = new TarefaAcademicaMatriculaDAO(db);
const anexoDAO = new AnexoDAO(db);
const matriculaDAO = new MatriculaDAO(db);
const eventoDAO = new EventoDAO(db);
const pendenciaDAO = new PendenciaDAO(db);
const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(db);
const relacaoAnexosDAO = new RelacaoAnexosDAO(db);
const categoriaDAO = new CategoriaConteudoDAO(db);
const alocacaoDAO = new MaterialProfessorTurmaDAO(db);
const questaoDAO = new TarefaAcademicaQuestaoDAO(db);
const alternativaDAO = new TarefaAcademicaAlternativaDAO(db);
const respostaDAO = new TarefaAcademicaRespostaDAO(db);

const tarefaService = new TarefaAcademicaService(
  tarefaDAO,
  tarefaMatriculaDAO,
  anexoDAO,
  matriculaDAO,
  categoriaDAO,
  alocacaoDAO,
  questaoDAO,
  alternativaDAO,
  respostaDAO
);
const relacaoAnexosService = new RelacaoAnexosService(relacaoAnexosDAO, anexoDAO, tarefaDAO, eventoDAO, pendenciaDAO, escolaxUsuarioxFuncaoDAO);
const tarefaControle = new TarefaAcademicaControl(tarefaService, relacaoAnexosService);
const tarefaMiddleware = new TarefaAcademicaMiddleware();

const tarefaRoteador = new TarefaAcademicaRoteador(tarefaMiddleware, tarefaControle);
export const tarefaAcademicaRoutes = tarefaRoteador.createRoutes();
