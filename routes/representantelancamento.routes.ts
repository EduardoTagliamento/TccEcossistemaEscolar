import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import RepresentanteLancamentoControl from "../backend/controllers/representantelancamento.controller";
import RepresentanteLancamentoMiddleware from "../backend/middlewares/representantelancamento.middleware";
import RepresentanteLancamentoService, { getRepresentanteLancamentoService } from "../backend/services/representantelancamento.service";
import { EscolaConfiguracaoDAO } from "../backend/repositories/escolaconfiguracao.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

/**
 * Rotas do fluxo "Lançamento de Prova/Tarefa/Conteúdo por Representante" —
 * ver docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md.
 */
export default class RepresentanteLancamentoRoteador {
  #router: Router;
  #controle: RepresentanteLancamentoControl;
  #middleware: typeof RepresentanteLancamentoMiddleware;

  constructor(controle: RepresentanteLancamentoControl) {
    console.log("⬆️ RepresentanteLancamentoRoteador.constructor()");
    this.#router = Router();
    this.#middleware = RepresentanteLancamentoMiddleware;
    this.#controle = controle;
  }

  createRoutes = (): Router => {
    console.log("⬆️ RepresentanteLancamentoRoteador.createRoutes()");

    this.#router.use(AuthMiddleware.authenticate);

    this.#router.get(
      "/escolas/:escolaGUID/minhas-alocacoes",
      this.#middleware.validarEscolaParams,
      this.#controle.listarMinhasAlocacoes
    );

    this.#router.get(
      "/turmas/:turmaGUID/permissao",
      this.#middleware.validarTurmaParams,
      this.#controle.verificarPermissao
    );

    this.#router.post(
      "/turmas/:turmaGUID/provas",
      this.#middleware.validarTurmaParams,
      this.#middleware.validarCriarProva,
      this.#controle.criarProva
    );

    this.#router.post(
      "/turmas/:turmaGUID/tarefas",
      this.#middleware.validarTurmaParams,
      this.#middleware.validarCriarTarefa,
      this.#controle.criarTarefa
    );

    this.#router.post(
      "/turmas/:turmaGUID/conteudos",
      this.#middleware.validarTurmaParams,
      this.#middleware.validarCriarConteudo,
      this.#controle.criarConteudo
    );

    this.#router.get(
      "/escolas/:escolaGUID/flag",
      this.#middleware.validarEscolaParams,
      this.#controle.obterFlag
    );

    this.#router.put(
      "/escolas/:escolaGUID/flag",
      this.#middleware.validarEscolaParams,
      this.#middleware.validarDefinirFlag,
      this.#controle.definirFlag
    );

    return this.#router;
  };
}

// ========== Instanciação e Injeção de Dependências ==========
const db = MysqlDatabase.getInstance();
const representanteService: RepresentanteLancamentoService = getRepresentanteLancamentoService();
const escolaConfiguracaoDAO = new EscolaConfiguracaoDAO(db);
const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(db);
const representanteControle = new RepresentanteLancamentoControl(representanteService, escolaConfiguracaoDAO, escolaxUsuarioxFuncaoDAO);

const representanteRoteador = new RepresentanteLancamentoRoteador(representanteControle);
export const representanteLancamentoRoutes = representanteRoteador.createRoutes();
