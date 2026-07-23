import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { ConteudoController } from "../backend/controllers/conteudo.controller";
import { ConteudoMiddleware } from "../backend/middlewares/conteudo.middleware";
import {
  conteudoUploadMiddleware,
  handleConteudoMulterError,
} from "../backend/middlewares/conteudo-upload.middleware";
import ConteudoService from "../backend/services/conteudo.service";
import { ConteudoDAO } from "../backend/repositories/conteudo.repository";
import ConteudoTurmaDAO from "../backend/repositories/conteudoturma.repository";
import { ConteudoCronometradoDAO } from "../backend/repositories/conteudocronometrado.repository";
import { ConteudoTextoDAO } from "../backend/repositories/conteudotexto.repository";
import { ConteudoPaginadoArquivoDAO } from "../backend/repositories/conteudopaginadoarquivo.repository";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { CategoriaConteudoDAO } from "../backend/repositories/categoriaconteudo.repository";
import { MaterialProfessorTurmaDAO } from "../backend/repositories/materiaxprofessorxturma.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { ConteudoProgressoController } from "../backend/controllers/conteudoprogresso.controller";
import ConteudoProgressoService from "../backend/services/conteudoprogresso.service";
import { ConteudoProgressoDAO } from "../backend/repositories/conteudoprogresso.repository";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";

export default class ConteudoRoteador {
  #router: Router;
  #controller: ConteudoController;
  #progressoController: ConteudoProgressoController;

  constructor(controller: ConteudoController, progressoController: ConteudoProgressoController) {
    console.log("⬆️  ConteudoRoteador.constructor()");
    this.#router = Router();
    this.#controller = controller;
    this.#progressoController = progressoController;
  }

  createRoutes = () => {
    console.log("⬆️  ConteudoRoteador.createRoutes()");

    this.#router.use(AuthMiddleware.authenticate);

    this.#router.post(
      "/",
      conteudoUploadMiddleware,
      handleConteudoMulterError,
      ConteudoMiddleware.validarCriacao,
      this.#controller.store
    );

    this.#router.get("/", this.#controller.index);

    this.#router.get("/:guid", ConteudoMiddleware.validarGUID, this.#controller.show);

    this.#router.delete("/:guid", ConteudoMiddleware.validarGUID, this.#controller.destroy);

    // Progresso de consumo (aluno)
    this.#router.post("/:guid/progresso/video", ConteudoMiddleware.validarGUID, this.#progressoController.registrarVideo);
    this.#router.post("/:guid/progresso/texto", ConteudoMiddleware.validarGUID, this.#progressoController.registrarTexto);
    this.#router.get("/:guid/progresso", ConteudoMiddleware.validarGUID, this.#progressoController.buscar);
    this.#router.post("/pagina/:paginaGuid/progresso", this.#progressoController.registrarPagina);

    return this.#router;
  };
}

export const conteudoRouterFactory = () => {
  const database = new MysqlDatabase();
  const conteudoDAO = new ConteudoDAO(database);
  const conteudoTurmaDAO = new ConteudoTurmaDAO(database);
  const cronometradoDAO = new ConteudoCronometradoDAO(database);
  const textoDAO = new ConteudoTextoDAO(database);
  const paginadoDAO = new ConteudoPaginadoArquivoDAO(database);
  const materiaDAO = new MateriaDAO(database);
  const turmaDAO = new TurmaDAO(database);
  const categoriaDAO = new CategoriaConteudoDAO(database);
  const matProfTurDAO = new MaterialProfessorTurmaDAO(database);

  const conteudoService = new ConteudoService(
    conteudoDAO,
    conteudoTurmaDAO,
    cronometradoDAO,
    textoDAO,
    paginadoDAO,
    materiaDAO,
    turmaDAO,
    categoriaDAO,
    matProfTurDAO
  );
  const controller = new ConteudoController(conteudoService);

  const progressoDAO = new ConteudoProgressoDAO(database);
  const matriculaDAO = new MatriculaDAO(database);
  const progressoService = new ConteudoProgressoService(progressoDAO, conteudoDAO, paginadoDAO, matriculaDAO);
  const progressoController = new ConteudoProgressoController(progressoService);

  const roteador = new ConteudoRoteador(controller, progressoController);

  return roteador.createRoutes();
};
