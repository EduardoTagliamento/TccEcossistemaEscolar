import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { EscolaConfiguracaoController } from "../backend/controllers/escolaconfiguracao.controller";
import { EscolaConfiguracaoMiddleware } from "../backend/middlewares/escolaconfiguracao.middleware";
import EscolaConfiguracaoService from "../backend/services/escolaconfiguracao.service";
import { EscolaConfiguracaoDAO } from "../backend/repositories/escolaconfiguracao.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

export default class EscolaConfiguracaoRoteador {
  #router: Router;
  #escolaConfiguracaoController: EscolaConfiguracaoController;

  constructor(escolaConfiguracaoController: EscolaConfiguracaoController) {
    console.log("⬆️  EscolaConfiguracaoRoteador.constructor()");
    this.#router = Router();
    this.#escolaConfiguracaoController = escolaConfiguracaoController;
  }

  createRoutes = () => {
    console.log("⬆️  EscolaConfiguracaoRoteador.createRoutes()");

    this.#router.use(AuthMiddleware.authenticate);

    // GET /api/escola-configuracao/:escolaGUID
    this.#router.get(
      "/:escolaGUID",
      EscolaConfiguracaoMiddleware.validarEscolaGUID,
      this.#escolaConfiguracaoController.show
    );

    // GET /api/escola-configuracao/:escolaGUID/slots
    this.#router.get(
      "/:escolaGUID/slots",
      EscolaConfiguracaoMiddleware.validarEscolaGUID,
      this.#escolaConfiguracaoController.slots
    );

    // PUT /api/escola-configuracao/:escolaGUID
    this.#router.put(
      "/:escolaGUID",
      EscolaConfiguracaoMiddleware.validarEscolaGUID,
      EscolaConfiguracaoMiddleware.validarAtualizacao,
      this.#escolaConfiguracaoController.update
    );

    return this.#router;
  };
}

export const escolaConfiguracaoRouterFactory = () => {
  const database = new MysqlDatabase();
  const escolaConfiguracaoDAO = new EscolaConfiguracaoDAO(database);
  const escolaDAO = new EscolaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const escolaConfiguracaoService = new EscolaConfiguracaoService(
    escolaConfiguracaoDAO,
    escolaDAO,
    escolaxUsuarioxFuncaoDAO
  );
  const escolaConfiguracaoController = new EscolaConfiguracaoController(escolaConfiguracaoService);
  const roteador = new EscolaConfiguracaoRoteador(escolaConfiguracaoController);

  return roteador.createRoutes();
};
