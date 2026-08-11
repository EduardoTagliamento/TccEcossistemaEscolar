import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase';
import { SugestaoController } from '../backend/controllers/sugestao.controller';
import { SugestaoService } from '../backend/services/sugestao.service';
import { SugestaoDAO } from '../backend/repositories/sugestao.repository';
import { RelacaoAnexosDAO } from '../backend/repositories/relacaoanexos.repository';
import { AnexoDAO } from '../backend/repositories/anexo.repository';
import { UsuarioDAO } from '../backend/repositories/usuario.repository';
import { SugestaoMiddleware } from '../backend/middlewares/sugestao.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';
import { plataformaAdminGuard } from '../backend/guards/plataformaAdmin.guard';

export default class SugestaoRoteador {
  #router: Router;
  #controller: SugestaoController;

  constructor(controller: SugestaoController) {
    console.log('⬆️  SugestaoRoteador.constructor()');
    this.#router = Router();
    this.#controller = controller;
  }

  createRoutes = () => {
    console.log('⬆️  SugestaoRoteador.createRoutes()');

    this.#router.use(AuthMiddleware.authenticate);

    // POST /api/sugestao - qualquer usuário autenticado pode enviar
    this.#router.post('/', SugestaoMiddleware.validarCreate, this.#controller.create);

    // GET /api/sugestao - só admin de plataforma
    this.#router.get('/', plataformaAdminGuard, this.#controller.index);

    // DELETE /api/sugestao/:guid - só admin de plataforma
    this.#router.delete('/:guid', plataformaAdminGuard, SugestaoMiddleware.validarGUID, this.#controller.destroy);

    return this.#router;
  };
}

export const sugestaoRouterFactory = () => {
  const database = new MysqlDatabase();
  const sugestaoDAO = new SugestaoDAO(database);
  const relacaoAnexosDAO = new RelacaoAnexosDAO(database);
  const anexoDAO = new AnexoDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const service = new SugestaoService(sugestaoDAO, relacaoAnexosDAO, anexoDAO, usuarioDAO);
  const controller = new SugestaoController(service);
  const roteador = new SugestaoRoteador(controller);

  return roteador.createRoutes();
};
