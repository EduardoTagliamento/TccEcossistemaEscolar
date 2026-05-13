import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { CursoController } from "../backend/controllers/curso.controller";
import { CursoMiddleware } from "../backend/middlewares/curso.middleware";
import CursoService from "../backend/services/curso.service";
import { CursoDAO } from "../backend/repositories/curso.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

export default class CursoRoteador {
  #router: Router;
  #cursoController: CursoController;

  constructor(cursoController: CursoController) {
    console.log("⬆️  CursoRoteador.constructor()");
    this.#router = Router();
    this.#cursoController = cursoController;
  }

  createRoutes = () => {
    console.log("⬆️  CursoRoteador.createRoutes()");

    // Todas as rotas requerem autenticação
    this.#router.use(AuthMiddleware.authenticate);

    // POST /api/curso
    this.#router.post(
      "/",
      CursoMiddleware.validarCriacao,
      this.#cursoController.store
    );

    // GET /api/curso?EscolaGUID=&CursoStatus=
    this.#router.get("/", this.#cursoController.index);

    // GET /api/curso/:guid
    this.#router.get(
      "/:guid",
      CursoMiddleware.validarGUID,
      this.#cursoController.show
    );

    // PUT /api/curso/:guid
    this.#router.put(
      "/:guid",
      CursoMiddleware.validarGUID,
      CursoMiddleware.validarAtualizacao,
      this.#cursoController.update
    );

    // DELETE /api/curso/:guid
    this.#router.delete(
      "/:guid",
      CursoMiddleware.validarGUID,
      this.#cursoController.destroy
    );

    return this.#router;
  };
}

export const cursoRouterFactory = () => {
  const database = new MysqlDatabase();
  const cursoDAO = new CursoDAO(database);
  const escolaDAO = new EscolaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const cursoService = new CursoService(cursoDAO, escolaDAO, escolaxUsuarioxFuncaoDAO);
  const cursoController = new CursoController(cursoService);
  const roteador = new CursoRoteador(cursoController);

  return roteador.createRoutes();
};
