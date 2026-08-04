import { Request, Response, NextFunction } from "express";
import { getMateriaGlobalService } from "../services/materiaglobal.service";

/**
 * Endpoints de administração da taxonomia global — fila de revisão de
 * `MateriaGlobal` pendente (spec item 17) e submatérias, usados pela tela
 * de admin de plataforma. Todos atrás de `plataformaAdminGuard`.
 */
export class MateriaGlobalController {
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MateriaGlobalController.index()");
    try {
      const status = req.query.Status as string | undefined;
      const materiasGlobais =
        status === "Pendente"
          ? await getMateriaGlobalService().listarPendentes()
          : await getMateriaGlobalService().listarConfirmados();

      res.status(200).json({ success: true, message: "Matérias globais listadas com sucesso", data: { materiasGlobais } });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/materiaglobal/:guid/resolver-pendente — body: { MesclarEmGUID: string | null }
  resolverPendente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MateriaGlobalController.resolverPendente()");
    try {
      await getMateriaGlobalService().resolverPendente(req.params.guid, req.body.MesclarEmGUID ?? null);
      res.status(200).json({ success: true, message: "Pendência resolvida com sucesso", data: null });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/materiaglobal/:guid/submateria
  listarSubMaterias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MateriaGlobalController.listarSubMaterias()");
    try {
      const submaterias = await getMateriaGlobalService().listarSubMaterias(req.params.guid);
      res.status(200).json({ success: true, message: "Submatérias listadas com sucesso", data: { submaterias } });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/materiaglobal/:guid/submateria — body: { Nome }
  criarSubMateria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MateriaGlobalController.criarSubMateria()");
    try {
      const submateria = await getMateriaGlobalService().criarSubMateria(req.params.guid, req.body.Nome);
      res.status(201).json({ success: true, message: "Submatéria criada com sucesso", data: { submateria } });
    } catch (error) {
      next(error);
    }
  };
}
