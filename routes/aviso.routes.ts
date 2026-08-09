import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase';
import { AvisoController } from '../backend/controllers/aviso.controller';
import { AvisoService } from '../backend/services/aviso.service';
import { AvisoDAO } from '../backend/repositories/aviso.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../backend/repositories/escolaxusuarioxfuncao.repository';
import { RelacaoAnexosDAO } from '../backend/repositories/relacaoanexos.repository';
import { AnexoDAO } from '../backend/repositories/anexo.repository';
import { MatriculaDAO } from '../backend/repositories/matricula.repository';
import { AvisoMiddleware } from '../backend/middlewares/aviso.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

export default class AvisoRoteador {
  #router: Router;
  #avisoController: AvisoController;

  constructor(avisoController: AvisoController) {
    console.log('⬆️  AvisoRoteador.constructor()');
    this.#router = Router();
    this.#avisoController = avisoController;
  }

  createRoutes = () => {
    console.log('⬆️  AvisoRoteador.createRoutes()');

    // TODAS AS ROTAS REQUEREM AUTENTICAÇÃO
    this.#router.use(AuthMiddleware.authenticate);

    // POST /api/aviso - Criar novo aviso (Direção/Coordenação/Secretaria)
    this.#router.post(
      '/',
      AvisoMiddleware.validarCreate,
      this.#avisoController.create
    );

    // GET /api/aviso/nao-visualizado - Aviso não visto mais recente (ANTES da rota /:guid)
    this.#router.get(
      '/nao-visualizado',
      AvisoMiddleware.validarFiltros,
      this.#avisoController.naoVisualizado
    );

    // GET /api/aviso - Listar avisos enviados
    this.#router.get(
      '/',
      AvisoMiddleware.validarFiltros,
      this.#avisoController.index
    );

    // GET /api/aviso/:guid - Buscar aviso específico (marca visualização)
    this.#router.get(
      '/:guid',
      AvisoMiddleware.validarGUID,
      this.#avisoController.show
    );

    // DELETE /api/aviso/:guid - Excluir aviso
    this.#router.delete(
      '/:guid',
      AvisoMiddleware.validarGUID,
      this.#avisoController.destroy
    );

    return this.#router;
  };
}

export const avisoRouterFactory = () => {
  const database = new MysqlDatabase();
  const avisoDAO = new AvisoDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const relacaoAnexosDAO = new RelacaoAnexosDAO(database);
  const anexoDAO = new AnexoDAO(database);
  const matriculaDAO = new MatriculaDAO(database);
  const avisoService = new AvisoService(avisoDAO, escolaxUsuarioxFuncaoDAO, relacaoAnexosDAO, anexoDAO, matriculaDAO);
  const avisoController = new AvisoController(avisoService);
  const roteador = new AvisoRoteador(avisoController);

  return roteador.createRoutes();
};
