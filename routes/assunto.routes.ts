import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { AssuntoController } from "../backend/controllers/assunto.controller";
import AssuntoService from "../backend/services/assunto.service";
import { AssuntoDAO } from "../backend/repositories/assunto.repository";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { MaterialProfessorTurmaDAO } from "../backend/repositories/materiaxprofessorxturma.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

export default class AssuntoRoteador {
  #router: Router;
  #controller: AssuntoController;

  constructor(controller: AssuntoController) {
    console.log("⬆️  AssuntoRoteador.constructor()");
    this.#router = Router();
    this.#controller = controller;
  }

  createRoutes = (): Router => {
    console.log("⬆️  AssuntoRoteador.createRoutes()");

    this.#router.use(AuthMiddleware.authenticate);

    this.#router.post("/", this.#controller.store);
    this.#router.get("/", this.#controller.index);
    this.#router.delete("/:guid", this.#controller.destroy);

    return this.#router;
  };
}

export const assuntoRouterFactory = () => {
  const database = new MysqlDatabase();
  const assuntoDAO = new AssuntoDAO(database);
  const materiaDAO = new MateriaDAO(database);
  const alocacaoDAO = new MaterialProfessorTurmaDAO(database);
  const assuntoService = new AssuntoService(assuntoDAO, materiaDAO, alocacaoDAO);
  const controller = new AssuntoController(assuntoService);
  const roteador = new AssuntoRoteador(controller);

  return roteador.createRoutes();
};
