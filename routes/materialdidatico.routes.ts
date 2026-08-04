import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { MaterialDidaticoController } from "../backend/controllers/materialdidatico.controller";
import MaterialDidaticoService from "../backend/services/materialdidatico.service";
import { MaterialDidaticoDAO } from "../backend/repositories/materialdidatico.repository";
import { MaterialDidaticoPaginaDAO } from "../backend/repositories/materialdidaticopagina.repository";
import { MaterialDidaticoCapituloDAO } from "../backend/repositories/materialdidaticocapitulo.repository";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import {
  materialDidaticoUploadMiddleware,
  handleMaterialDidaticoMulterError,
} from "../backend/middlewares/materialdidatico-upload.middleware";

export default class MaterialDidaticoRoteador {
  #router: Router;
  #controller: MaterialDidaticoController;

  constructor(controller: MaterialDidaticoController) {
    console.log("⬆️  MaterialDidaticoRoteador.constructor()");
    this.#router = Router();
    this.#controller = controller;
  }

  createRoutes = (): Router => {
    console.log("⬆️  MaterialDidaticoRoteador.createRoutes()");

    this.#router.use(AuthMiddleware.authenticate);

    this.#router.post("/", this.#controller.store);
    this.#router.get("/", this.#controller.index);
    this.#router.get("/por-materia/:materiaGUID", this.#controller.indexPorMateria);

    this.#router.post(
      "/:guid/paginas",
      materialDidaticoUploadMiddleware,
      handleMaterialDidaticoMulterError,
      this.#controller.uploadPaginas
    );
    this.#router.get("/:guid/paginas", this.#controller.listarPaginas);
    this.#router.patch("/pagina/:paginaGuid/revisar", this.#controller.revisarPagina);

    this.#router.get("/:guid/sugestao-capitulos", this.#controller.sugerirCapitulos);
    this.#router.post("/capitulo", this.#controller.criarCapitulo);
    this.#router.get("/:guid/capitulos", this.#controller.listarCapitulos);
    this.#router.get("/:guid/capitulos/materia/:materiaGUID", this.#controller.listarCapitulosPorMateria);

    return this.#router;
  };
}

export const materialDidaticoRouterFactory = () => {
  const database = new MysqlDatabase();
  const materialDAO = new MaterialDidaticoDAO(database);
  const paginaDAO = new MaterialDidaticoPaginaDAO(database);
  const capituloDAO = new MaterialDidaticoCapituloDAO(database);
  const materiaDAO = new MateriaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const service = new MaterialDidaticoService(materialDAO, paginaDAO, capituloDAO, materiaDAO, escolaxUsuarioxFuncaoDAO);
  const controller = new MaterialDidaticoController(service);
  const roteador = new MaterialDidaticoRoteador(controller);

  return roteador.createRoutes();
};
