import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { TurmaController } from "../backend/controllers/turma.controller";
import { TurmaMiddleware } from "../backend/middlewares/turma.middleware";
import TurmaService from "../backend/services/turma.service";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { CursoDAO } from "../backend/repositories/curso.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import ConversaGrupoService from "../backend/services/conversa-grupo.service";
import { ConversaDAO } from "../backend/repositories/conversa.repository";
import { ConversaGrupoDAO } from "../backend/repositories/conversa-grupo.repository";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";

export default class TurmaRoteador {
  #router: Router;
  #turmaController: TurmaController;

  constructor(turmaController: TurmaController) {
    console.log("⬆️  TurmaRoteador.constructor()");
    this.#router = Router();
    this.#turmaController = turmaController;
  }

  createRoutes = () => {
    console.log("⬆️  TurmaRoteador.createRoutes()");

    // Todas as rotas requerem autenticação
    this.#router.use(AuthMiddleware.authenticate);

    // POST /api/turma
    this.#router.post(
      "/",
      TurmaMiddleware.validarCriacao,
      this.#turmaController.store
    );

    // GET /api/turma?EscolaGUID=&CursoGUID=&TurmaIsTecnico=&TurmaStatus=
    this.#router.get("/", this.#turmaController.index);

    // GET /api/turma/:guid
    this.#router.get(
      "/:guid",
      TurmaMiddleware.validarGUID,
      this.#turmaController.show
    );

    // PUT /api/turma/:guid
    this.#router.put(
      "/:guid",
      TurmaMiddleware.validarGUID,
      TurmaMiddleware.validarAtualizacao,
      this.#turmaController.update
    );

    // DELETE /api/turma/:guid
    this.#router.delete(
      "/:guid",
      TurmaMiddleware.validarGUID,
      this.#turmaController.destroy
    );

    return this.#router;
  };
}

export const turmaRouterFactory = () => {
  const database = new MysqlDatabase();
  const turmaDAO = new TurmaDAO(database);
  const escolaDAO = new EscolaDAO(database);
  const cursoDAO = new CursoDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const conversaGrupoService = new ConversaGrupoService(
    new ConversaDAO(database),
    new ConversaGrupoDAO(database),
    new MatriculaDAO(database)
  );
  const turmaService = new TurmaService(turmaDAO, escolaDAO, cursoDAO, escolaxUsuarioxFuncaoDAO, conversaGrupoService);
  const turmaController = new TurmaController(turmaService);
  const roteador = new TurmaRoteador(turmaController);

  return roteador.createRoutes();
};
