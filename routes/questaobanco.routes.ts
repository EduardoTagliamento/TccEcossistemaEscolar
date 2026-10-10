import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { QuestaoBancoController } from "../backend/controllers/questaobanco.controller";
import QuestaoBancoService from "../backend/services/questaobanco.service";
import { QuestaoBancoDAO } from "../backend/repositories/questaobanco.repository";
import { QuestaoBancoAlternativaDAO } from "../backend/repositories/questaobancoalternativa.repository";
import QuestaoBancoProgressoService from "../backend/services/questaobancoprogresso.service";
import { QuestaoBancoProgressoDAO } from "../backend/repositories/questaobancoprogresso.repository";
import { VestibularDAO } from "../backend/repositories/vestibular.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { RelacaoAnexosDAO } from "../backend/repositories/relacaoanexos.repository";
import { AnexoDAO } from "../backend/repositories/anexo.repository";
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

    // Leitura: qualquer usuário autenticado (aluno praticando, spec item 12) — só Status=Validado
    this.#router.get("/", this.#controller.index);
    this.#router.get("/contagem", this.#controller.indexContagem);
    this.#router.get("/progresso", this.#controller.indexProgresso);
    this.#router.get("/vestibular", this.#controller.indexVestibulares);
    this.#router.get("/anos", this.#controller.indexAnos);

    // Fila de validação: só admin de plataforma (vê Status=Pendente, não exposto na rota pública)
    this.#router.get("/pendentes", plataformaAdminGuard, this.#controller.indexPendentes);

    // Simulado (SPEC_SIMULADOS_BANCO_QUESTOES.md) — qualquer usuário autenticado, mesma regra de
    // leitura do resto do banco de questões. Literal, antes de "/:guid" por segurança/clareza,
    // embora "/simulado/pdf" não bata com o padrão "/:guid/progresso" de qualquer forma.
    this.#router.post("/simulado/pdf", this.#controller.pdfSimulado);

    // Busca individual (ex.: "refazer essa questão" a partir do histórico) — DEPOIS dos literais
    // acima (/contagem, /progresso, /vestibular, /pendentes), senão eles cairiam aqui como :guid.
    this.#router.get("/:guid", this.#controller.show);

    // Progresso por aluno (tracking "feita"/"marcada") — qualquer aluno autenticado, só na própria conta
    this.#router.post("/:guid/progresso", this.#controller.registrarResposta);
    this.#router.delete("/:guid/progresso", this.#controller.desmarcarFeita);
    this.#router.patch("/:guid/marcar", this.#controller.definirMarcada);

    // Escrita: só admin de plataforma (spec item 13)
    this.#router.post("/", plataformaAdminGuard, escritaSensivelRateLimitMiddleware, this.#controller.store);
    this.#router.patch("/:guid", plataformaAdminGuard, escritaSensivelRateLimitMiddleware, this.#controller.update);
    this.#router.patch("/:guid/validar", plataformaAdminGuard, escritaSensivelRateLimitMiddleware, this.#controller.validar);
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
  const relacaoAnexosDAO = new RelacaoAnexosDAO(database);
  const anexoDAO = new AnexoDAO(database);
  const progressoDAO = new QuestaoBancoProgressoDAO(database);
  const service = new QuestaoBancoService(questaoDAO, alternativaDAO, vestibularDAO, usuarioDAO, relacaoAnexosDAO, anexoDAO);
  const progressoService = new QuestaoBancoProgressoService(progressoDAO);
  const controller = new QuestaoBancoController(service, progressoService);
  const roteador = new QuestaoBancoRoteador(controller);

  return roteador.createRoutes();
};
