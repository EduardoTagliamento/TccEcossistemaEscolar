/**
 * 🛣️  Routes - Auditoria
 *
 * Define os endpoints HTTP de consulta do Registro de Auditoria (ver
 * docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seção 5). Não há
 * POST/PATCH/DELETE expostos — a criação de registro acontece só
 * internamente via AuditoriaService.registrar(), chamada pelos outros
 * services, nunca por um client HTTP direto.
 *
 * Rotas:
 * - GET /api/auditoria/categorias                          - Catálogo de categorias
 * - GET /api/auditoria/:RegistroAuditoriaGUID?EscolaGUID=   - Detalhe de um registro
 * - GET /api/auditoria?EscolaGUID=&...filtros               - Listar registros da escola
 */

import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import { RegistroAuditoriaDAO } from "../backend/repositories/registroauditoria.repository";
import { CategoriaAuditoriaDAO } from "../backend/repositories/categoriaauditoria.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import AuditoriaService from "../backend/services/auditoria.service";
import AuditoriaController from "../backend/controllers/auditoria.controller";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

export function auditoriaRoutes(): Router {
  const router = Router();

  const database = new MysqlDatabase();
  const registroDAO = new RegistroAuditoriaDAO(database);
  const categoriaDAO = new CategoriaAuditoriaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);

  const auditoriaService = new AuditoriaService(registroDAO, categoriaDAO);
  const controller = new AuditoriaController(auditoriaService, escolaxUsuarioxFuncaoDAO);

  router.use(AuthMiddleware.authenticate);

  // Ordem importa: "/categorias" precisa vir antes de "/:RegistroAuditoriaGUID"
  router.get("/categorias", controller.categorias);
  router.get("/:RegistroAuditoriaGUID", controller.show);
  router.get("/", controller.index);

  return router;
}
