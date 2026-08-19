import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { GrupoEletivoController } from "../backend/controllers/grupoeletivo.controller";
import GrupoEletivoService from "../backend/services/grupoeletivo.service";
import { GrupoEletivoDAO } from "../backend/repositories/grupoeletivo.repository";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

export default class GrupoEletivoRoteador {
  #router: Router;
  #grupoEletivoController: GrupoEletivoController;

  constructor(grupoEletivoController: GrupoEletivoController) {
    console.log("⬆️  GrupoEletivoRoteador.constructor()");
    this.#router = Router();
    this.#grupoEletivoController = grupoEletivoController;
  }

  createRoutes = () => {
    console.log("⬆️  GrupoEletivoRoteador.createRoutes()");

    // Todas as rotas requerem autenticação
    this.#router.use(AuthMiddleware.authenticate);

    // POST /api/grupoeletivo
    this.#router.post("/", this.#grupoEletivoController.store);

    // GET /api/grupoeletivo?EscolaGUID=&GrupoEletivoStatus=
    this.#router.get("/", this.#grupoEletivoController.index);

    // GET /api/grupoeletivo/:guid
    this.#router.get("/:guid", this.#grupoEletivoController.show);

    // PUT /api/grupoeletivo/:guid
    this.#router.put("/:guid", this.#grupoEletivoController.update);

    // DELETE /api/grupoeletivo/:guid
    this.#router.delete("/:guid", this.#grupoEletivoController.destroy);

    // GET /api/grupoeletivo/:guid/membros
    this.#router.get("/:guid/membros", this.#grupoEletivoController.listarMembros);

    // POST /api/grupoeletivo/:guid/membros
    this.#router.post("/:guid/membros", this.#grupoEletivoController.adicionarMembro);

    // DELETE /api/grupoeletivo/:guid/membros/:usuarioGUID
    this.#router.delete("/:guid/membros/:usuarioGUID", this.#grupoEletivoController.removerMembro);

    return this.#router;
  };
}

export const grupoEletivoRouterFactory = () => {
  const database = new MysqlDatabase();
  const grupoEletivoDAO = new GrupoEletivoDAO(database);
  const matriculaDAO = new MatriculaDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const grupoEletivoService = new GrupoEletivoService(
    grupoEletivoDAO,
    matriculaDAO,
    usuarioDAO,
    escolaxUsuarioxFuncaoDAO
  );
  const grupoEletivoController = new GrupoEletivoController(grupoEletivoService);
  const roteador = new GrupoEletivoRoteador(grupoEletivoController);

  return roteador.createRoutes();
};
