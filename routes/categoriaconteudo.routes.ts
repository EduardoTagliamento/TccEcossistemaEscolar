import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { CategoriaConteudoController } from "../backend/controllers/categoriaconteudo.controller";
import { CategoriaConteudoMiddleware } from "../backend/middlewares/categoriaconteudo.middleware";
import CategoriaConteudoService from "../backend/services/categoriaconteudo.service";
import { CategoriaConteudoDAO } from "../backend/repositories/categoriaconteudo.repository";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

export default class CategoriaConteudoRoteador {
  #router: Router;
  #controller: CategoriaConteudoController;

  constructor(controller: CategoriaConteudoController) {
    console.log("⬆️  CategoriaConteudoRoteador.constructor()");
    this.#router = Router();
    this.#controller = controller;
  }

  createRoutes = () => {
    console.log("⬆️  CategoriaConteudoRoteador.createRoutes()");

    this.#router.use(AuthMiddleware.authenticate);

    this.#router.post("/", CategoriaConteudoMiddleware.validarCriacao, this.#controller.store);
    this.#router.get("/", this.#controller.index);
    this.#router.put(
      "/:guid",
      CategoriaConteudoMiddleware.validarGUID,
      CategoriaConteudoMiddleware.validarAtualizacao,
      this.#controller.update
    );
    this.#router.delete("/:guid", CategoriaConteudoMiddleware.validarGUID, this.#controller.destroy);

    return this.#router;
  };
}

export const categoriaConteudoRouterFactory = () => {
  const database = new MysqlDatabase();
  const categoriaDAO = new CategoriaConteudoDAO(database);
  const materiaDAO = new MateriaDAO(database);
  const categoriaService = new CategoriaConteudoService(categoriaDAO, materiaDAO);
  const controller = new CategoriaConteudoController(categoriaService);
  const roteador = new CategoriaConteudoRoteador(controller);

  return roteador.createRoutes();
};
