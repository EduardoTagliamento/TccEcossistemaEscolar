import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import EscolaxUsuarioxFuncaoControl from "../backend/controllers/escolaxusuarioxfuncao.controller";
import EscolaxUsuarioxFuncaoMiddleware from "../backend/middlewares/escolaxusuarioxfuncao.middleware";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import EscolaxUsuarioxFuncaoService from "../backend/services/escolaxusuarioxfuncao.service";

export default class EscolaxUsuarioxFuncaoRoteador {
  #router: Router;
  #controller: EscolaxUsuarioxFuncaoControl;
  #middleware: EscolaxUsuarioxFuncaoMiddleware;

  constructor(
    middleware: EscolaxUsuarioxFuncaoMiddleware,
    controller: EscolaxUsuarioxFuncaoControl
  ) {
    console.log("Router: EscolaxUsuarioxFuncaoRoteador.constructor()");
    this.#router = Router();
    this.#middleware = middleware;
    this.#controller = controller;
  }

  createRoutes = () => {
    console.log("Router: EscolaxUsuarioxFuncaoRoteador.createRoutes()");

    this.#router.post(
      "/",
      this.#middleware.validateCreateBody,
      this.#controller.store
    );

    this.#router.put(
      "/:EscolaxUsuarioxFuncaoId",
      this.#middleware.validateIdParam,
      this.#middleware.validateUpdateBody,
      this.#controller.update
    );

    this.#router.delete(
      "/:EscolaxUsuarioxFuncaoId",
      this.#middleware.validateIdParam,
      this.#controller.destroy
    );

    this.#router.get("/", this.#controller.index);

    this.#router.get(
      "/:EscolaxUsuarioxFuncaoId",
      this.#middleware.validateIdParam,
      this.#controller.show
    );

    return this.#router;
  };
}

export const escolaxusuarioxfuncaoRouterFactory = () => {
  const database = new MysqlDatabase();
  const dao = new EscolaxUsuarioxFuncaoDAO(database);
  const service = new EscolaxUsuarioxFuncaoService(dao);
  const controller = new EscolaxUsuarioxFuncaoControl(service);
  const middleware = new EscolaxUsuarioxFuncaoMiddleware();
  const roteador = new EscolaxUsuarioxFuncaoRoteador(middleware, controller);

  return roteador.createRoutes();
};
