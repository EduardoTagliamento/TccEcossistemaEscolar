import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import TarefaAcademicaControl from "../backend/controllers/tarefaacademica.controller";
import TarefaAcademicaMiddleware from "../backend/middlewares/tarefaacademica.middleware";
import TarefaAcademicaService from "../backend/services/tarefaacademica.service";
import { TarefaAcademicaDAO } from "../backend/repositories/tarefaacademica.repository";
import { AnexoDAO } from "../backend/repositories/anexo.repository";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";
import { EventoDAO } from "../backend/repositories/evento.repository";
import { RelacaoAnexosDAO } from "../backend/repositories/relacaoanexos.repository";
import RelacaoAnexosService from "../backend/services/relacaoanexos.service";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

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

    return this.#router;
  };
}

// ========== Instanciação e Injeção de Dependências ==========
const db = MysqlDatabase.getInstance();
const tarefaDAO = new TarefaAcademicaDAO(db);
const anexoDAO = new AnexoDAO(db);
const matriculaDAO = new MatriculaDAO(db);
const eventoDAO = new EventoDAO(db);
const relacaoAnexosDAO = new RelacaoAnexosDAO(db);

const tarefaService = new TarefaAcademicaService(tarefaDAO, anexoDAO, matriculaDAO);
const relacaoAnexosService = new RelacaoAnexosService(relacaoAnexosDAO, anexoDAO, tarefaDAO, eventoDAO);
const tarefaControle = new TarefaAcademicaControl(tarefaService, relacaoAnexosService);
const tarefaMiddleware = new TarefaAcademicaMiddleware();

const tarefaRoteador = new TarefaAcademicaRoteador(tarefaMiddleware, tarefaControle);
export const tarefaAcademicaRoutes = tarefaRoteador.createRoutes();
