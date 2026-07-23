import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import ProvaAgendadaControl from "../backend/controllers/provaagendada.controller";
import ProvaAgendadaMiddleware from "../backend/middlewares/provaagendada.middleware";
import ProvaAgendadaService from "../backend/services/provaagendada.service";
import { ProvaAgendadaDAO } from "../backend/repositories/provaagendada.repository";
import ProvaAgendadaTurmaDAO from "../backend/repositories/provaagendada-turma.repository";
import { AnexoDAO } from "../backend/repositories/anexo.repository";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { CategoriaConteudoDAO } from "../backend/repositories/categoriaconteudo.repository";
import { ProvaAgendadaVisualizacaoDAO } from "../backend/repositories/provaagendadavisualizacao.repository";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { provaRateLimitMiddleware } from "../backend/middlewares/rate-limit.middleware";

export default class ProvaAgendadaRoteador {
  #router: Router;
  #controle: ProvaAgendadaControl;
  #middleware: ProvaAgendadaMiddleware;

  constructor(middleware: ProvaAgendadaMiddleware, controle: ProvaAgendadaControl) {
    console.log("⬆️ ProvaAgendadaRoteador.constructor()");
    this.#router = Router();
    this.#middleware = middleware;
    this.#controle = controle;
  }

  createRoutes = (): Router => {
    console.log("⬆️ ProvaAgendadaRoteador.createRoutes()");

    this.#router.use(provaRateLimitMiddleware, AuthMiddleware.authenticate);

    this.#router.post(
      "/",
      this.#middleware.validateCreateBody,
      this.#controle.store
    );

    this.#router.get(
      "/",
      this.#middleware.validateFilters,
      this.#controle.index
    );

    // POST /api/prova/turma/:ProvaAgendadaTurmaGUID/visualizar (DEVE vir antes de "/:ProvaAgendadaGUID")
    this.#router.post(
      "/turma/:ProvaAgendadaTurmaGUID/visualizar",
      this.#controle.registrarVisualizacao
    );

    this.#router.get(
      "/:ProvaAgendadaGUID",
      this.#middleware.validateIdParam,
      this.#controle.show
    );

    this.#router.put(
      "/:ProvaAgendadaGUID",
      this.#middleware.validateIdParam,
      this.#middleware.validateUpdateBody,
      this.#controle.update
    );

    this.#router.delete(
      "/:ProvaAgendadaGUID",
      this.#middleware.validateIdParam,
      this.#controle.destroy
    );

    return this.#router;
  };
}

// ========== Instanciação e Injeção de Dependências (N:N Normalizado) ==========
const db = MysqlDatabase.getInstance();
const provaDAO = new ProvaAgendadaDAO(db);
const provaTurmaDAO = new ProvaAgendadaTurmaDAO(db); // Nova tabela intermediária
const anexoDAO = new AnexoDAO(db);
const turmaDAO = new TurmaDAO(db);
const materiaDAO = new MateriaDAO(db);
const categoriaDAO = new CategoriaConteudoDAO(db);
const visualizacaoDAO = new ProvaAgendadaVisualizacaoDAO(db);
const matriculaDAO = new MatriculaDAO(db);
const provaService = new ProvaAgendadaService(
  provaDAO,
  provaTurmaDAO,
  anexoDAO,
  turmaDAO,
  materiaDAO,
  categoriaDAO,
  visualizacaoDAO,
  matriculaDAO
);
const provaControle = new ProvaAgendadaControl(provaService);
const provaMiddleware = new ProvaAgendadaMiddleware();

const provaRoteador = new ProvaAgendadaRoteador(provaMiddleware, provaControle);
export const provaAgendadaRoutes = provaRoteador.createRoutes();
