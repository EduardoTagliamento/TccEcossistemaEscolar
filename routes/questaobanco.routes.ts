import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { QuestaoBancoController } from "../backend/controllers/questaobanco.controller";
import QuestaoBancoService from "../backend/services/questaobanco.service";
import { QuestaoBancoDAO } from "../backend/repositories/questaobanco.repository";
import { QuestaoBancoAlternativaDAO } from "../backend/repositories/questaobancoalternativa.repository";
import { VestibularDAO } from "../backend/repositories/vestibular.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { plataformaAdminGuard } from "../backend/guards/plataformaAdmin.guard";
import { escritaSensivelRateLimitMiddleware } from "../backend/middlewares/rate-limit.middleware";

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
    this.#router.post("/", plataformaAdminGuard, escritaSensivelRateLimitMiddleware, this.#controller.store);
    this.#router.delete("/:guid", plataformaAdminGuard, escritaSensivelRateLimitMiddleware, this.#controller.destroy);
    this.#router.post("/vestibular", plataformaAdminGuard, escritaSensivelRateLimitMiddleware, this.#controller.storeVestibular);

    return this.#router;
  };
}

export const questaoBancoRouterFactory = () => {
  const database = new MysqlDatabase();
  const questaoDAO = new QuestaoBancoDAO(database);
  const alternativaDAO = new QuestaoBancoAlternativaDAO(database);
  const vestibularDAO = new VestibularDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const service = new QuestaoBancoService(questaoDAO, alternativaDAO, vestibularDAO, usuarioDAO);
  const controller = new QuestaoBancoController(service);
  const roteador = new QuestaoBancoRoteador(controller);

  return roteador.createRoutes();
};
