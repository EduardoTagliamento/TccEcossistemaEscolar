import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase';
import { AnotacaoController } from '../backend/controllers/anotacao.controller';
import { AnotacaoService } from '../backend/services/anotacao.service';
import { AnotacaoDAO } from '../backend/repositories/anotacao.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../backend/repositories/escolaxusuarioxfuncao.repository';
import { AnotacaoMiddleware } from '../backend/middlewares/anotacao.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

export default class AnotacaoRoteador {
  #router: Router;
  #anotacaoController: AnotacaoController;

  constructor(anotacaoController: AnotacaoController) {
    console.log('⬆️  AnotacaoRoteador.constructor()');
    this.#router = Router();
    this.#anotacaoController = anotacaoController;
  }

  createRoutes = () => {
    console.log('⬆️  AnotacaoRoteador.createRoutes()');

    // TODAS AS ROTAS REQUEREM AUTENTICAÇÃO
    this.#router.use(AuthMiddleware.authenticate);

    // POST /api/anotacao - Criar nova anotação
    this.#router.post(
      '/',
      AnotacaoMiddleware.validarCreate,
      this.#anotacaoController.create
    );

    // GET /api/anotacao/estatisticas - Estatísticas (ANTES da rota /:guid)
    this.#router.get(
      '/estatisticas',
      this.#anotacaoController.stats
    );

    // GET /api/anotacao - Listar anotações
    this.#router.get(
      '/',
      AnotacaoMiddleware.validarFiltros,
      this.#anotacaoController.index
    );

    // GET /api/anotacao/:guid - Buscar específica
    this.#router.get(
      '/:guid',
      AnotacaoMiddleware.validarGUID,
      this.#anotacaoController.show
    );

    // PUT /api/anotacao/:guid - Atualizar
    this.#router.put(
      '/:guid',
      AnotacaoMiddleware.validarGUID,
      AnotacaoMiddleware.validarUpdate,
      this.#anotacaoController.update
    );

    // PATCH /api/anotacao/:guid/toggle - Toggle feito
    this.#router.patch(
      '/:guid/toggle',
      AnotacaoMiddleware.validarGUID,
      this.#anotacaoController.toggleFeito
    );

    // DELETE /api/anotacao/:guid - Excluir
    this.#router.delete(
      '/:guid',
      AnotacaoMiddleware.validarGUID,
      this.#anotacaoController.destroy
    );

    return this.#router;
  };
}

export const anotacaoRouterFactory = () => {
  const database = new MysqlDatabase();
  const anotacaoDAO = new AnotacaoDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const anotacaoService = new AnotacaoService(anotacaoDAO, escolaxUsuarioxFuncaoDAO);
  const anotacaoController = new AnotacaoController(anotacaoService);
  const roteador = new AnotacaoRoteador(anotacaoController);

  return roteador.createRoutes();
};

