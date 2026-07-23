import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { MateriaController } from "../backend/controllers/materia.controller";
import { MateriaMiddleware } from "../backend/middlewares/materia.middleware";
import MateriaService from "../backend/services/materia.service";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { CursoDAO } from "../backend/repositories/curso.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { MateriaCustomizacaoController } from "../backend/controllers/materiacustomizacao.controller";
import MateriaCustomizacaoService from "../backend/services/materiacustomizacao.service";
import { MateriaCustomizacaoDAO } from "../backend/repositories/materiacustomizacao.repository";
import { MaterialProfessorTurmaDAO } from "../backend/repositories/materiaxprofessorxturma.repository";
import { uploadCapaMiddleware, handleMulterError } from "../backend/middlewares/upload.middleware";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";

export default class MateriaRoteador {
  #router: Router;
  #materiaController: MateriaController;
  #customizacaoController: MateriaCustomizacaoController;

  constructor(materiaController: MateriaController, customizacaoController: MateriaCustomizacaoController) {
    console.log("⬆️  MateriaRoteador.constructor()");
    this.#router = Router();
    this.#materiaController = materiaController;
    this.#customizacaoController = customizacaoController;
  }

  createRoutes = () => {
    console.log("⬆️  MateriaRoteador.createRoutes()");

    // Todas as rotas requerem autenticação
    this.#router.use(AuthMiddleware.authenticate);

    // POST /api/materia
    this.#router.post(
      "/",
      MateriaMiddleware.validarCriacao,
      this.#materiaController.store
    );

    // GET /api/materia?EscolaGUID=&MateriaStatus=&MateriaIsTecnico=
    this.#router.get("/", this.#materiaController.index);

    // GET /api/materia/aluno/:usuarioCPF?EscolaGUID= (DEVE vir antes de "/:guid")
    this.#router.get("/aluno/:usuarioCPF", this.#materiaController.listarDoAluno);

    // GET /api/materia/:guid
    this.#router.get(
      "/:guid",
      MateriaMiddleware.validarGUID,
      this.#materiaController.show
    );

    // PUT /api/materia/:guid
    this.#router.put(
      "/:guid",
      MateriaMiddleware.validarGUID,
      MateriaMiddleware.validarAtualizacao,
      this.#materiaController.update
    );

    // DELETE /api/materia/:guid
    this.#router.delete(
      "/:guid",
      MateriaMiddleware.validarGUID,
      this.#materiaController.destroy
    );

    // PUT /api/materia/:guid/customizacao
    this.#router.put(
      "/:guid/customizacao",
      MateriaMiddleware.validarGUID,
      uploadCapaMiddleware.single("imagem"),
      handleMulterError,
      this.#customizacaoController.salvar
    );

    // GET /api/materia/:guid/customizacao?UsuarioCPF=
    this.#router.get(
      "/:guid/customizacao",
      MateriaMiddleware.validarGUID,
      this.#customizacaoController.buscar
    );

    // GET /api/materia/:guid/customizacoes
    this.#router.get(
      "/:guid/customizacoes",
      MateriaMiddleware.validarGUID,
      this.#customizacaoController.listar
    );

    return this.#router;
  };
}

export const materiaRouterFactory = () => {
  const database = new MysqlDatabase();
  const materiaDAO = new MateriaDAO(database);
  const escolaDAO = new EscolaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const cursoDAO = new CursoDAO(database);
  const matriculaDAO = new MatriculaDAO(database);
  const alocacaoDAO = new MaterialProfessorTurmaDAO(database);
  const customizacaoDAO = new MateriaCustomizacaoDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const materiaService = new MateriaService(
    materiaDAO,
    escolaDAO,
    escolaxUsuarioxFuncaoDAO,
    cursoDAO,
    matriculaDAO,
    alocacaoDAO,
    customizacaoDAO,
    usuarioDAO
  );
  const materiaController = new MateriaController(materiaService);

  const customizacaoService = new MateriaCustomizacaoService(customizacaoDAO, materiaDAO, escolaDAO, alocacaoDAO);
  const customizacaoController = new MateriaCustomizacaoController(customizacaoService);

  const roteador = new MateriaRoteador(materiaController, customizacaoController);

  return roteador.createRoutes();
};
