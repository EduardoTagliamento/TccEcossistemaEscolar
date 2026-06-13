import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { MateriaController } from "../backend/controllers/materia.controller";
import { MateriaMiddleware } from "../backend/middlewares/materia.middleware";
import MateriaService from "../backend/services/materia.service";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { CursoDAO } from "../backend/repositories/curso.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

export default class MateriaRoteador {
  #router: Router;
  #materiaController: MateriaController;

  constructor(materiaController: MateriaController) {
    console.log("⬆️  MateriaRoteador.constructor()");
    this.#router = Router();
    this.#materiaController = materiaController;
  }

  createRoutes = () => {
    console.log("⬆️  MateriaRoteador.createRoutes()");

    // Todas as rotas requerem autenticação
    this.#router.use(AuthMiddleware.authenticate);

    // POST /api/materia
    this.#router.post(
      "/",
      MateriaMiddleware.validarCriacao,
      this.#materiaController.store
    );

    // GET /api/materia?EscolaGUID=&MateriaStatus=&MateriaIsTecnico=
    this.#router.get("/", this.#materiaController.index);

    // GET /api/materia/:guid
    this.#router.get(
      "/:guid",
      MateriaMiddleware.validarGUID,
      this.#materiaController.show
    );

    // PUT /api/materia/:guid
    this.#router.put(
      "/:guid",
      MateriaMiddleware.validarGUID,
      MateriaMiddleware.validarAtualizacao,
      this.#materiaController.update
    );

    // DELETE /api/materia/:guid
    this.#router.delete(
      "/:guid",
      MateriaMiddleware.validarGUID,
      this.#materiaController.destroy
    );

    return this.#router;
  };
}

export const materiaRouterFactory = () => {
  const database = new MysqlDatabase();
  const materiaDAO = new MateriaDAO(database);
  const escolaDAO = new EscolaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const cursoDAO = new CursoDAO(database);
  const materiaService = new MateriaService(materiaDAO, escolaDAO, escolaxUsuarioxFuncaoDAO, cursoDAO);
  const materiaController = new MateriaController(materiaService);
  const roteador = new MateriaRoteador(materiaController);

  return roteador.createRoutes();
};
