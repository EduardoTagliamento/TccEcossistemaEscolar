import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import CalendarioControl from "../backend/controllers/calendario.controller";
import CalendarioMiddleware from "../backend/middlewares/calendario.middleware";
import CalendarioService from "../backend/services/calendario.service";
import { CalendarioDAO } from "../backend/repositories/calendario.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

export default class CalendarioRoteador {
  #router: Router;
  #controle: CalendarioControl;
  #middleware: CalendarioMiddleware;

  constructor(middleware: CalendarioMiddleware, controle: CalendarioControl) {
    console.log("⬆️ CalendarioRoteador.constructor()");
    this.#router = Router();
    this.#middleware = middleware;
    this.#controle = controle;
  }

  createRoutes = (): Router => {
    console.log("⬆️ CalendarioRoteador.createRoutes()");

    this.#router.get(
      "/",
      AuthMiddleware.authenticate,
      this.#middleware.validateFilters,
      this.#controle.index
    );

    this.#router.get(
      "/dia/:data",
      AuthMiddleware.authenticate,
      this.#middleware.validateFilters,
      this.#middleware.validateDiaParam,
      this.#controle.showDia
    );

    return this.#router;
  };
}

const db = MysqlDatabase.getInstance();
const calendarioDAO = new CalendarioDAO(db);
const eufDAO = new EscolaxUsuarioxFuncaoDAO(db);
const calendarioService = new CalendarioService(calendarioDAO, eufDAO);
const calendarioControl = new CalendarioControl(calendarioService);
const calendarioMiddleware = new CalendarioMiddleware();

const calendarioRoteador = new CalendarioRoteador(calendarioMiddleware, calendarioControl);
export const calendarioRoutes = calendarioRoteador.createRoutes();
