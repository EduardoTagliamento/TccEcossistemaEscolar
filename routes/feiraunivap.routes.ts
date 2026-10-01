import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { FeiraUnivapController } from "../backend/controllers/feiraunivap.controller";
import FeiraUnivapService from "../backend/services/feiraunivap.service";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { CursoDAO } from "../backend/repositories/curso.repository";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { ConversaDAO } from "../backend/repositories/conversa.repository";
import { ConversaGrupoDAO } from "../backend/repositories/conversa-grupo.repository";
import { TurmaGrupoWhatsappDAO } from "../backend/repositories/turmagrupowhatsapp.repository";
import ConversaGrupoService from "../backend/services/conversa-grupo.service";
import TurmaGrupoWhatsappService from "../backend/services/turmagrupowhatsapp.service";

/**
 * Rotas públicas (sem AuthMiddleware) do fluxo de ativação da feira técnica
 * do Colégio Univap — ver docs/SPEC_FEIRA_TECNICA_UNIVAP_2026.md. Público de
 * propósito: é o próprio aluno, sem conta ainda, preenchendo na hora.
 */
export default class FeiraUnivapRoteador {
  #router: Router;
  #controller: FeiraUnivapController;

  constructor(controller: FeiraUnivapController) {
    console.log("⬆️  FeiraUnivapRoteador.constructor()");
    this.#router = Router();
    this.#controller = controller;
  }

  createRoutes = () => {
    console.log("⬆️  FeiraUnivapRoteador.createRoutes()");

    // GET /api/feira-univap/turmas?ano=1|2|3
    this.#router.get("/turmas", this.#controller.listarTurmas);

    // GET /api/feira-univap/pessoas?turmaGUID=...
    this.#router.get("/pessoas", this.#controller.listarPessoas);

    // POST /api/feira-univap/ativar
    this.#router.post("/ativar", this.#controller.ativar);

    return this.#router;
  };
}

export const feiraUnivapRouterFactory = () => {
  const database = new MysqlDatabase();
  const turmaDAO = new TurmaDAO(database);
  const cursoDAO = new CursoDAO(database);
  const matriculaDAO = new MatriculaDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);

  const conversaGrupoService = new ConversaGrupoService(
    new ConversaDAO(database),
    new ConversaGrupoDAO(database),
    matriculaDAO,
    usuarioDAO
  );
  const turmaGrupoWhatsappService = new TurmaGrupoWhatsappService(
    new TurmaGrupoWhatsappDAO(database),
    turmaDAO,
    usuarioDAO,
    escolaxUsuarioxFuncaoDAO,
    database,
    conversaGrupoService
  );

  const service = new FeiraUnivapService(
    turmaDAO,
    cursoDAO,
    matriculaDAO,
    usuarioDAO,
    conversaGrupoService,
    turmaGrupoWhatsappService
  );
  const controller = new FeiraUnivapController(service);
  const roteador = new FeiraUnivapRoteador(controller);

  return roteador.createRoutes();
};
