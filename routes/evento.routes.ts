/**
 * 🛣️  Routes - Evento
 * 
 * Define os endpoints HTTP para o recurso Evento.
 * 
 * Rotas:
 * - POST   /api/evento                  - Criar evento
 * - GET    /api/evento                  - Listar eventos
 * - GET    /api/evento/:EventoGUID      - Buscar por ID
 * - PUT    /api/evento/:EventoGUID      - Atualizar
 * - DELETE /api/evento/:EventoGUID      - Excluir (soft delete)
 */

import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { EventoDAO } from "../backend/repositories/evento.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { AnexoDAO } from "../backend/repositories/anexo.repository";
import { TarefaAcademicaDAO } from "../backend/repositories/tarefaacademica.repository";
import { RelacaoAnexosDAO } from "../backend/repositories/relacaoanexos.repository";
import EventoService from "../backend/services/evento.service";
import RelacaoAnexosService from "../backend/services/relacaoanexos.service";
import EventoController from "../backend/controllers/evento.controller";
import EventoMiddleware from "../backend/middlewares/evento.middleware";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

/**
 * Factory de rotas de Evento
 */
export function eventoRoutes(): Router {
  const router = Router();

  // Instanciar dependências (Injeção de Dependências)
  const database = new MysqlDatabase();
  const eventoDAO = new EventoDAO(database);
  const escolaDAO = new EscolaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const anexoDAO = new AnexoDAO(database);
  const tarefaDAO = new TarefaAcademicaDAO(database);
  const relacaoAnexosDAO = new RelacaoAnexosDAO(database);

  const eventoService = new EventoService(
    eventoDAO,
    escolaDAO,
    escolaxUsuarioxFuncaoDAO
  );

  const relacaoAnexosService = new RelacaoAnexosService(
    relacaoAnexosDAO,
    anexoDAO,
    tarefaDAO,
    eventoDAO
  );

  const eventoController = new EventoController(eventoService, relacaoAnexosService);

  // ==================== ROTAS ====================

  /**
   * POST /api/evento
   * Criar novo evento
   * Requer: Autenticação + Admin (Coordenação/Secretaria/Direção)
   */
  router.post(
    "/",
    AuthMiddleware.authenticate,
    EventoMiddleware.validarCreate,
    eventoController.store
  );

  /**
   * GET /api/evento
   * Listar eventos com filtros opcionais
   * Query params: EscolaGUID, EventoStatus, dataInicio, dataFim, limit, offset
   * Requer: Autenticação
   */
  router.get(
    "/",
    AuthMiddleware.authenticate,
    EventoMiddleware.validarQueryParams,
    eventoController.index
  );

  /**
   * GET /api/evento/:EventoGUID
   * Buscar evento por ID
   * Requer: Autenticação
   */
  router.get(
    "/:EventoGUID",
    AuthMiddleware.authenticate,
    EventoMiddleware.validarGUID,
    eventoController.show
  );

  /**
   * PUT /api/evento/:EventoGUID
   * Atualizar evento
   * Requer: Autenticação + Admin (Coordenação/Secretaria/Direção)
   */
  router.put(
    "/:EventoGUID",
    AuthMiddleware.authenticate,
    EventoMiddleware.validarGUID,
    EventoMiddleware.validarUpdate,
    eventoController.update
  );

  /**
   * DELETE /api/evento/:EventoGUID
   * Excluir evento (soft delete)
   * Requer: Autenticação + Admin (Coordenação/Secretaria/Direção)
   */
  router.delete(
    "/:EventoGUID",
    AuthMiddleware.authenticate,
    EventoMiddleware.validarGUID,
    eventoController.destroy
  );

  /**
   * GET /api/evento/:EventoGUID/anexos
   * Listar anexos vinculados ao evento
   * Requer: Autenticação
   */
  router.get(
    "/:EventoGUID/anexos",
    AuthMiddleware.authenticate,
    EventoMiddleware.validarGUID,
    eventoController.listarAnexos
  );

  /**
   * POST /api/evento/:EventoGUID/anexos
   * Vincular anexo ao evento
   * Requer: Autenticação + Admin (Coordenação/Secretaria/Direção)
   */
  router.post(
    "/:EventoGUID/anexos",
    AuthMiddleware.authenticate,
    EventoMiddleware.validarGUID,
    eventoController.vincularAnexo
  );

  return router;
}
