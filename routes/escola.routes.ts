import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import EscolaControl from "../backend/controllers/escola.controller";
import EscolaMiddleware from "../backend/middlewares/escola.middleware";
import EscolaService from "../backend/services/escola.service";
import { EscolaDAO } from "../backend/repositories/escola.repository";

export default class EscolaRoteador {
  #router: Router;
  #escolaControle: EscolaControl;
  #escolaMiddleware: EscolaMiddleware;

  constructor(escolaMiddleware: EscolaMiddleware, escolaControle: EscolaControl) {
    console.log("⬆️ EscolaRoteador.constructor()");
    this.#router = Router();
    this.#escolaMiddleware = escolaMiddleware;
    this.#escolaControle = escolaControle;
  }

  createRoutes = () => {
    console.log("⬆️ EscolaRoteador.createRoutes()");

    this.#router.post(
      "/",
      this.#escolaMiddleware.validateCreateBody,
      this.#escolaControle.store
    );

    this.#router.put(
      "/:EscolaGUID",
      this.#escolaMiddleware.validateIdParam,
      this.#escolaMiddleware.validateUpdateBody,
      this.#escolaControle.update
    );

    this.#router.delete(
      "/:EscolaGUID",
      this.#escolaMiddleware.validateIdParam,
      this.#escolaControle.destroy
    );

    this.#router.get("/", this.#escolaControle.index);

    this.#router.get(
      "/:EscolaGUID",
      this.#escolaMiddleware.validateIdParam,
      this.#escolaControle.show
    );

    return this.#router;
  };
}

export const escolaRouterFactory = () => {
  const database = new MysqlDatabase();
  const escolaDAO = new EscolaDAO(database);
  const escolaService = new EscolaService(escolaDAO);
  const escolaControle = new EscolaControl(escolaService);
  const escolaMiddleware = new EscolaMiddleware();
  const roteador = new EscolaRoteador(escolaMiddleware, escolaControle);

  return roteador.createRoutes();
};