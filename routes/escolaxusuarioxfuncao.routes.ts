import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import EscolaxUsuarioxFuncaoControl from "../backend/controllers/escolaxusuarioxfuncao.controller";
import EscolaxUsuarioxFuncaoMiddleware from "../backend/middlewares/escolaxusuarioxfuncao.middleware";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { UsuarioxEscolaAcessoDAO } from "../backend/repositories/usuarioxescolaacesso.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import EscolaxUsuarioxFuncaoService from "../backend/services/escolaxusuarioxfuncao.service";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

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
      AuthMiddleware.authenticate,
      this.#middleware.validateCreateBody,
      this.#controller.store
    );

    this.#router.put(
      "/:EscolaxUsuarioxFuncaoId",
      AuthMiddleware.authenticate,
      this.#middleware.validateIdParam,
      this.#middleware.validateUpdateBody,
      this.#controller.update
    );

    this.#router.delete(
      "/:EscolaxUsuarioxFuncaoId",
      AuthMiddleware.authenticate,
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
  const acessoDAO = new UsuarioxEscolaAcessoDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const service = new EscolaxUsuarioxFuncaoService(dao, acessoDAO, usuarioDAO);
  const controller = new EscolaxUsuarioxFuncaoControl(service);
  const middleware = new EscolaxUsuarioxFuncaoMiddleware();
  const roteador = new EscolaxUsuarioxFuncaoRoteador(middleware, controller);

  return roteador.createRoutes();
};
