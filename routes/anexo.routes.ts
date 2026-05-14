import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import AnexoControl from "../backend/controllers/anexo.controller";
import AnexoMiddleware from "../backend/middlewares/anexo.middleware";
import AnexoService from "../backend/services/anexo.service";
import { AnexoDAO } from "../backend/repositories/anexo.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { anexoUploadMiddleware } from "../backend/middlewares/anexo-upload.middleware";

export default class AnexoRoteador {
  #router: Router;
  #anexoControle: AnexoControl;
  #anexoMiddleware: AnexoMiddleware;

  constructor(anexoMiddleware: AnexoMiddleware, anexoControle: AnexoControl) {
    console.log("⬆️ AnexoRoteador.constructor()");
    this.#router = Router();
    this.#anexoMiddleware = anexoMiddleware;
    this.#anexoControle = anexoControle;
  }

  createRoutes = () => {
    console.log("⬆️ AnexoRoteador.createRoutes()");

    // POST /api/anexo - Upload de anexo
    this.#router.post(
      "/",
      AuthMiddleware.authenticate,
      anexoUploadMiddleware.single("file"),
      this.#anexoMiddleware.validateUploadBody,
      this.#anexoControle.store
    );

    // GET /api/anexo - Listar anexos (com filtros opcionais)
    this.#router.get(
      "/",
      AuthMiddleware.authenticate,
      this.#anexoMiddleware.validateFilters,
      this.#anexoControle.index
    );

    // GET /api/anexo/:AnexoGUID - Buscar metadados
    this.#router.get(
      "/:AnexoGUID",
      AuthMiddleware.authenticate,
      this.#anexoMiddleware.validateIdParam,
      this.#anexoControle.show
    );

    // GET /api/anexo/:AnexoGUID/download - Download do arquivo
    this.#router.get(
      "/:AnexoGUID/download",
      AuthMiddleware.authenticate,
      this.#anexoMiddleware.validateIdParam,
      this.#anexoControle.download
    );

    // DELETE /api/anexo/:AnexoGUID - Excluir anexo
    this.#router.delete(
      "/:AnexoGUID",
      AuthMiddleware.authenticate,
      this.#anexoMiddleware.validateIdParam,
      this.#anexoControle.destroy
    );

    return this.#router;
  };
}

// ========== Instanciação e Injeção de Dependências ==========
const db = MysqlDatabase.getInstance();
const anexoDAO = new AnexoDAO(db);
const escolaDAO = new EscolaDAO(db);
const anexoService = new AnexoService(anexoDAO, escolaDAO);
const anexoControle = new AnexoControl(anexoService);
const anexoMiddleware = new AnexoMiddleware();

const anexoRoteador = new AnexoRoteador(anexoMiddleware, anexoControle);
export const anexoRoutes = anexoRoteador.createRoutes();
