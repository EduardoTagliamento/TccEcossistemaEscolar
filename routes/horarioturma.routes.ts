import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { HorarioTurmaController } from "../backend/controllers/horarioturma.controller";
import { HorarioTurmaMiddleware } from "../backend/middlewares/horarioturma.middleware";
import HorarioTurmaService from "../backend/services/horarioturma.service";
import { HorarioTurmaDAO } from "../backend/repositories/horarioturma.repository";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { MaterialProfessorTurmaDAO } from "../backend/repositories/materiaxprofessorxturma.repository";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { EscolaConfiguracaoDAO } from "../backend/repositories/escolaconfiguracao.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

/**
 * Rotas do cronograma (grade horária) da turma.
 * Montado no mesmo prefixo `/api/turma` do TurmaRoteador, mas em um router
 * separado — os caminhos ("/:turmaGUID/cronograma...") têm mais segmentos
 * que as rotas de CRUD de turma ("/:guid"), então não colidem.
 */
export default class HorarioTurmaRoteador {
  #router: Router;
  #horarioTurmaController: HorarioTurmaController;

  constructor(horarioTurmaController: HorarioTurmaController) {
    console.log("⬆️  HorarioTurmaRoteador.constructor()");
    this.#router = Router();
    this.#horarioTurmaController = horarioTurmaController;
  }

  createRoutes = () => {
    console.log("⬆️  HorarioTurmaRoteador.createRoutes()");

    this.#router.use(AuthMiddleware.authenticate);

    // GET /api/turma/professor/cronograma?EscolaGUID=X — precisa vir ANTES de
    // "/:turmaGUID/cronograma" (abaixo), senão "professor" seria capturado
    // como turmaGUID pela rota genérica (mesmo problema já visto com as rotas
    // de banco de questões: específicas sempre antes das paramétricas).
    this.#router.get("/professor/cronograma", this.#horarioTurmaController.cronogramaDoProfessor);

    // GET /api/turma/aluno/cronograma?EscolaGUID=X
    this.#router.get("/aluno/cronograma", this.#horarioTurmaController.cronogramaDoAluno);

    // GET /api/turma/:turmaGUID/cronograma
    this.#router.get(
      "/:turmaGUID/cronograma",
      HorarioTurmaMiddleware.validarTurmaGUID,
      this.#horarioTurmaController.show
    );

    // POST /api/turma/:turmaGUID/cronograma/slot
    this.#router.post(
      "/:turmaGUID/cronograma/slot",
      HorarioTurmaMiddleware.validarTurmaGUID,
      HorarioTurmaMiddleware.validarCriacaoSlot,
      this.#horarioTurmaController.store
    );

    // DELETE /api/turma/:turmaGUID/cronograma/slot/:horarioTurmaGUID
    this.#router.delete(
      "/:turmaGUID/cronograma/slot/:horarioTurmaGUID",
      HorarioTurmaMiddleware.validarTurmaGUID,
      HorarioTurmaMiddleware.validarHorarioTurmaGUID,
      this.#horarioTurmaController.destroy
    );

    return this.#router;
  };
}

export const horarioTurmaRouterFactory = () => {
  const database = new MysqlDatabase();
  const horarioTurmaDAO = new HorarioTurmaDAO(database);
  const turmaDAO = new TurmaDAO(database);
  const matProfTurDAO = new MaterialProfessorTurmaDAO(database);
  const materiaDAO = new MateriaDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const escolaConfiguracaoDAO = new EscolaConfiguracaoDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const matriculaDAO = new MatriculaDAO(database);

  const horarioTurmaService = new HorarioTurmaService(
    horarioTurmaDAO,
    turmaDAO,
    matProfTurDAO,
    materiaDAO,
    usuarioDAO,
    escolaConfiguracaoDAO,
    escolaxUsuarioxFuncaoDAO,
    matriculaDAO
  );
  const horarioTurmaController = new HorarioTurmaController(horarioTurmaService);
  const roteador = new HorarioTurmaRoteador(horarioTurmaController);

  return roteador.createRoutes();
};
