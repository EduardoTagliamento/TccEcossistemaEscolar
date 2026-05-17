/**
 * 🛣️  Routes - Pendência
 * 
 * Define os endpoints HTTP para o recurso Pendência.
 * 
 * Rotas:
 * - POST   /api/pendencia                     - Criar pendência
 * - GET    /api/pendencia                     - Listar pendências
 * - GET    /api/pendencia/contador/pendentes  - Contar pendentes
 * - GET    /api/pendencia/contador/atrasadas  - Contar atrasadas
 * - GET    /api/pendencia/:PendenciaGUID      - Buscar por ID
 * - PUT    /api/pendencia/:PendenciaGUID      - Atualizar
 * - DELETE /api/pendencia/:PendenciaGUID      - Excluir
 * - PATCH  /api/pendencia/:PendenciaGUID/feito - Marcar como feito
 */

import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { PendenciaDAO } from "../backend/repositories/pendencia.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { AnexoDAO } from "../backend/repositories/anexo.repository";
import { TarefaAcademicaDAO } from "../backend/repositories/tarefaacademica.repository";
import { EventoDAO } from "../backend/repositories/evento.repository";
import { RelacaoAnexosDAO } from "../backend/repositories/relacaoanexos.repository";
import PendenciaService from "../backend/services/pendencia.service";
import RelacaoAnexosService from "../backend/services/relacaoanexos.service";
import PendenciaController from "../backend/controllers/pendencia.controller";
import PendenciaMiddleware from "../backend/middlewares/pendencia.middleware";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

/**
 * Factory de rotas de Pendência
 */
export function pendenciaRoutes(): Router {
  const router = Router();

  // Instanciar dependências (Injeção de Dependências)
  const database = new MysqlDatabase();
  const pendenciaDAO = new PendenciaDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const escolaDAO = new EscolaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const anexoDAO = new AnexoDAO(database);
  const tarefaDAO = new TarefaAcademicaDAO(database);
  const eventoDAO = new EventoDAO(database);
  const relacaoAnexosDAO = new RelacaoAnexosDAO(database);

  const pendenciaService = new PendenciaService(
    pendenciaDAO,
    usuarioDAO,
    escolaDAO,
    escolaxUsuarioxFuncaoDAO
  );

  const relacaoAnexosService = new RelacaoAnexosService(
    relacaoAnexosDAO,
    anexoDAO,
    tarefaDAO,
    eventoDAO
  );

  const pendenciaController = new PendenciaController(pendenciaService, relacaoAnexosService);

  // ==================== ROTAS ====================

  /**
   * POST /api/pendencia
   * Criar nova pendência
   * Requer: Autenticação + Admin (Coordenação/Secretaria/Direção)
   */
  router.post(
    "/",
    AuthMiddleware.authenticate,
    PendenciaMiddleware.validarCreate,
    pendenciaController.store
  );

  /**
   * GET /api/pendencia
   * Listar pendências com filtros opcionais
   * Query params: EscolaGUID, PendenciaFeito, atrasadas, limit, offset
   * Requer: Autenticação
   */
  router.get(
    "/",
    AuthMiddleware.authenticate,
    PendenciaMiddleware.validarQueryParams,
    pendenciaController.index
  );

  /**
   * GET /api/pendencia/contador/pendentes
   * Contar pendências não concluídas do usuário
   * Query params: EscolaGUID (opcional)
   * Requer: Autenticação
   */
  router.get(
    "/contador/pendentes",
    AuthMiddleware.authenticate,
    PendenciaMiddleware.validarQueryContador,
    pendenciaController.contarPendentes
  );

  /**
   * GET /api/pendencia/contador/atrasadas
   * Contar pendências atrasadas do usuário
   * Query params: EscolaGUID (opcional)
   * Requer: Autenticação
   */
  router.get(
    "/contador/atrasadas",
    AuthMiddleware.authenticate,
    PendenciaMiddleware.validarQueryContador,
    pendenciaController.contarAtrasadas
  );

  /**
   * GET /api/pendencia/:PendenciaGUID
   * Buscar pendência por ID
   * Requer: Autenticação
   */
  router.get(
    "/:PendenciaGUID",
    AuthMiddleware.authenticate,
    PendenciaMiddleware.validarGUID,
    pendenciaController.show
  );

  /**
   * PUT /api/pendencia/:PendenciaGUID
   * Atualizar pendência
   * Requer: Autenticação + Admin (Coordenação/Secretaria/Direção)
   */
  router.put(
    "/:PendenciaGUID",
    AuthMiddleware.authenticate,
    PendenciaMiddleware.validarGUID,
    PendenciaMiddleware.validarUpdate,
    pendenciaController.update
  );

  /**
   * DELETE /api/pendencia/:PendenciaGUID
   * Excluir pendência
   * Requer: Autenticação + Admin (Coordenação/Secretaria/Direção)
   */
  router.delete(
    "/:PendenciaGUID",
    AuthMiddleware.authenticate,
    PendenciaMiddleware.validarGUID,
    pendenciaController.destroy
  );

  /**
   * PATCH /api/pendencia/:PendenciaGUID/feito
   * Marcar pendência como feita
   * Requer: Autenticação (usuário destinatário)
   */
  router.patch(
    "/:PendenciaGUID/feito",
    AuthMiddleware.authenticate,
    PendenciaMiddleware.validarGUID,
    pendenciaController.marcarComoFeito
  );

  /**
   * GET /api/pendencia/:PendenciaGUID/anexos
   * Listar anexos vinculados à pendência
   * Requer: Autenticação
   */
  router.get(
    "/:PendenciaGUID/anexos",
    AuthMiddleware.authenticate,
    PendenciaMiddleware.validarGUID,
    pendenciaController.listarAnexos
  );

  /**
   * POST /api/pendencia/:PendenciaGUID/anexos
   * Vincular anexo à pendência
   * Requer: Autenticação
   */
  router.post(
    "/:PendenciaGUID/anexos",
    AuthMiddleware.authenticate,
    PendenciaMiddleware.validarGUID,
    pendenciaController.vincularAnexo
  );

  return router;
}
