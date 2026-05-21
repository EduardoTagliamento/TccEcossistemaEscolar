import { Router } from 'express';
import { AnotacaoController } from '../backend/controllers/anotacao.controller';
import { AnotacaoService } from '../backend/services/anotacao.service';
import { AnotacaoDAO } from '../backend/repositories/anotacao.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../backend/repositories/escolaxusuarioxfuncao.repository';
import { AnotacaoMiddleware } from '../backend/middlewares/anotacao.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

export function anotacaoRouterFactory() {
  const router = Router();

  // Instanciar DAOs
  const anotacaoDAO = new AnotacaoDAO();
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO();

  // Instanciar Service
  const anotacaoService = new AnotacaoService(anotacaoDAO, escolaxUsuarioxFuncaoDAO);

  // Instanciar Controller
  const anotacaoController = new AnotacaoController(anotacaoService);

  // Instanciar Middlewares
  const authMiddleware = new AuthMiddleware();

  // TODAS AS ROTAS REQUEREM AUTENTICAÇÃO
  router.use(authMiddleware.autenticar);

  // POST /api/anotacao - Criar nova anotação
  router.post(
    '/',
    AnotacaoMiddleware.validarCreate,
    anotacaoController.create
  );

  // GET /api/anotacao/estatisticas - Estatísticas (ANTES da rota /:guid)
  router.get(
    '/estatisticas',
    anotacaoController.stats
  );

  // GET /api/anotacao - Listar anotações
  router.get(
    '/',
    AnotacaoMiddleware.validarFiltros,
    anotacaoController.index
  );

  // GET /api/anotacao/:guid - Buscar específica
  router.get(
    '/:guid',
    AnotacaoMiddleware.validarGUID,
    anotacaoController.show
  );

  // PUT /api/anotacao/:guid - Atualizar
  router.put(
    '/:guid',
    AnotacaoMiddleware.validarGUID,
    AnotacaoMiddleware.validarUpdate,
    anotacaoController.update
  );

  // PATCH /api/anotacao/:guid/toggle - Toggle feito/pendente
  router.patch(
    '/:guid/toggle',
    AnotacaoMiddleware.validarGUID,
    anotacaoController.toggleFeito
  );

  // DELETE /api/anotacao/:guid - Excluir
  router.delete(
    '/:guid',
    AnotacaoMiddleware.validarGUID,
    anotacaoController.destroy
  );

  return router;
}
