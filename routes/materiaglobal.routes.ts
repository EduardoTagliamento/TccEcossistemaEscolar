import { Router } from "express";
import { MateriaGlobalController } from "../backend/controllers/materiaglobal.controller";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { plataformaAdminGuard } from "../backend/guards/plataformaAdmin.guard";
import { escritaSensivelRateLimitMiddleware } from "../backend/middlewares/rate-limit.middleware";

const controller = new MateriaGlobalController();

export const materiaGlobalRouterFactory = () => {
  const router = Router();

  router.use(AuthMiddleware.authenticate);

  // Leitura (listar matéria/submatéria confirmadas) — qualquer usuário
  // autenticado pode ver, não só admin de plataforma. É a taxonomia que
  // alimenta os dropdowns do Banco de Questões do aluno (matéria ->
  // submatéria). O filtro ?Status=Pendente (fila de curadoria do admin)
  // continua restrito abaixo.
  router.get("/", (req, res, next) => {
    if (req.query.Status === "Pendente") {
      plataformaAdminGuard(req, res, next);
      return;
    }
    next();
  }, controller.index);
  router.get("/:guid/submateria", controller.listarSubMaterias);

  // Escrita (resolver pendência, criar submatéria) — continua só admin.
  router.post("/:guid/resolver-pendente", plataformaAdminGuard, escritaSensivelRateLimitMiddleware, controller.resolverPendente);
  router.post("/:guid/submateria", plataformaAdminGuard, escritaSensivelRateLimitMiddleware, controller.criarSubMateria);

  return router;
};
