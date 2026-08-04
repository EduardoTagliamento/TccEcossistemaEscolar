import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { QuestaoBancoController } from "../backend/controllers/questaobanco.controller";
import QuestaoBancoService from "../backend/services/questaobanco.service";
import { QuestaoBancoDAO } from "../backend/repositories/questaobanco.repository";
import { QuestaoBancoAlternativaDAO } from "../backend/repositories/questaobancoalternativa.repository";
import { VestibularDAO } from "../backend/repositories/vestibular.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { plataformaAdminGuard } from "../backend/guards/plataformaAdmin.guard";

export default class QuestaoBancoRoteador {
  #router: Router;
  #controller: QuestaoBancoController;

  constructor(controller: QuestaoBancoController) {
    console.log("⬆️  QuestaoBancoRoteador.constructor()");
    this.#router = Router();
    this.#controller = controller;
  }

  createRoutes = (): Router => {
    console.log("⬆️  QuestaoBancoRoteador.createRoutes()");

    this.#router.use(AuthMiddleware.authenticate);

    // Leitura: qualquer usuário autenticado (aluno praticando, spec item 12)
    this.#router.get("/", this.#controller.index);
    this.#router.get("/vestibular", this.#controller.indexVestibulares);

    // Escrita: só admin de plataforma (spec item 13)
    this.#router.post("/", plataformaAdminGuard, this.#controller.store);
    this.#router.delete("/:guid", plataformaAdminGuard, this.#controller.destroy);
    this.#router.post("/vestibular", plataformaAdminGuard, this.#controller.storeVestibular);

    return this.#router;
  };
}

export const questaoBancoRouterFactory = () => {
  const database = new MysqlDatabase();
  const questaoDAO = new QuestaoBancoDAO(database);
  const alternativaDAO = new QuestaoBancoAlternativaDAO(database);
  const vestibularDAO = new VestibularDAO(database);
  const service = new QuestaoBancoService(questaoDAO, alternativaDAO, vestibularDAO);
  const controller = new QuestaoBancoController(service);
  const roteador = new QuestaoBancoRoteador(controller);

  return roteador.createRoutes();
};
