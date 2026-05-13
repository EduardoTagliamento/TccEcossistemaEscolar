import { Request, Response, NextFunction } from "express";
import MateriaService from "../services/materia.service";
import { MateriaFilters } from "../repositories/materia.repository";

export class MateriaController {
  #materiaService: MateriaService;

  constructor(materiaService: MateriaService) {
    console.log("⬆️  MateriaController.constructor()");
    this.#materiaService = materiaService;
  }

  // POST /api/materia
  store = async (req: Request, res: Response, next: NextFunction) => {
    console.log("🔵 MateriaController.store()");

    try {
      const usuarioCPF = (req as any).usuario?.UsuarioCPF;

      if (!usuarioCPF) {
        return res.status(401).json({
          success: false,
          message: "Usuário não autenticado",
          data: null,
        });
      }

      const materia = await this.#materiaService.criarMateria(
        req.body.materia,
        usuarioCPF
      );

      return res.status(201).json({
        success: true,
        message: "Matéria criada com sucesso",
        data: { materia },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/materia?EscolaGUID=&MateriaStatus=&MateriaIsTecnico=
  index = async (req: Request, res: Response, next: NextFunction) => {
    console.log("🔵 MateriaController.index()");

    try {
      const filters: MateriaFilters = {
        EscolaGUID: req.query.EscolaGUID as string | undefined,
        MateriaStatus: req.query.MateriaStatus as "Ativa" | "Inativa" | undefined,
        MateriaIsTecnico:
          req.query.MateriaIsTecnico === "true"
            ? true
            : req.query.MateriaIsTecnico === "false"
            ? false
            : undefined,
      };

      const materias = await this.#materiaService.listarMaterias(filters);

      return res.json({
        success: true,
        message: "Matérias listadas com sucesso",
        data: {
          materias,
          total: materias.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/materia/:guid
  show = async (req: Request, res: Response, next: NextFunction) => {
    console.log("🔵 MateriaController.show()");

    try {
      const materia = await this.#materiaService.buscarMateria(req.params.guid);

      return res.json({
        success: true,
        message: "Matéria encontrada",
        data: { materia },
      });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/materia/:guid
  update = async (req: Request, res: Response, next: NextFunction) => {
    console.log("🔵 MateriaController.update()");

    try {
      const usuarioCPF = (req as any).usuario?.UsuarioCPF;

      if (!usuarioCPF) {
        return res.status(401).json({
          success: false,
          message: "Usuário não autenticado",
          data: null,
        });
      }

      const materia = await this.#materiaService.atualizarMateria(
        req.params.guid,
        req.body.materia,
        usuarioCPF
      );

      return res.json({
        success: true,
        message: "Matéria atualizada com sucesso",
        data: { materia },
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/materia/:guid
  destroy = async (req: Request, res: Response, next: NextFunction) => {
    console.log("🔵 MateriaController.destroy()");

    try {
      const usuarioCPF = (req as any).usuario?.UsuarioCPF;

      if (!usuarioCPF) {
        return res.status(401).json({
          success: false,
          message: "Usuário não autenticado",
          data: null,
        });
      }

      await this.#materiaService.excluirMateria(req.params.guid, usuarioCPF);

      return res.json({
        success: true,
        message: "Matéria excluída com sucesso",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
}
