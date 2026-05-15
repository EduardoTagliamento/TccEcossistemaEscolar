import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import ProvaAgendadaControl from "../backend/controllers/provaagendada.controller";
import ProvaAgendadaMiddleware from "../backend/middlewares/provaagendada.middleware";
import ProvaAgendadaService from "../backend/services/provaagendada.service";
import { ProvaAgendadaDAO } from "../backend/repositories/provaagendada.repository";
import { AnexoDAO } from "../backend/repositories/anexo.repository";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { MateriaDAO } from "../backend/repositories/materia.repository";
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

// ========== Instanciação e Injeção de Dependências ==========
const db = MysqlDatabase.getInstance();
const provaDAO = new ProvaAgendadaDAO(db);
const anexoDAO = new AnexoDAO(db);
const turmaDAO = new TurmaDAO(db);
const materiaDAO = new MateriaDAO(db);
const provaService = new ProvaAgendadaService(provaDAO, anexoDAO, turmaDAO, materiaDAO);
const provaControle = new ProvaAgendadaControl(provaService);
const provaMiddleware = new ProvaAgendadaMiddleware();

const provaRoteador = new ProvaAgendadaRoteador(provaMiddleware, provaControle);
export const provaAgendadaRoutes = provaRoteador.createRoutes();
