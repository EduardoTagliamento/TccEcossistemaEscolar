import { Router } from "express";
import { MateriaGlobalController } from "../backend/controllers/materiaglobal.controller";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { plataformaAdminGuard } from "../backend/guards/plataformaAdmin.guard";

const controller = new MateriaGlobalController();

export const materiaGlobalRouterFactory = () => {
  const router = Router();

  router.use(AuthMiddleware.authenticate, plataformaAdminGuard);

  router.get("/", controller.index);
  router.post("/:guid/resolver-pendente", controller.resolverPendente);
  router.get("/:guid/submateria", controller.listarSubMaterias);
  router.post("/:guid/submateria", controller.criarSubMateria);

  return router;
};
