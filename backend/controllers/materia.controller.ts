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
  // Aceita: { materia: {...} } OU { materias: [...] }
  store = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("🔵 MateriaController.store()");

    try {
      const usuarioCPF = req.user?.UsuarioCPF;

      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Usuário não autenticado",
          data: null,
        });
        return;
      }

      // Verificar se é batch (múltiplas matérias) ou individual
      if (req.body.materias && Array.isArray(req.body.materias)) {
        // Cadastro em massa
        const resultado = await this.#materiaService.criarMateriasEmMassa(
          req.body.materias,
          usuarioCPF
        );

        res.status(201).json({
          success: true,
          message: "Processamento em massa concluído",
          data: resultado,
        });
        return;
      }

      // Cadastro individual
      const materia = await this.#materiaService.criarMateria(
        req.body.materia,
        usuarioCPF
      );

      res.status(201).json({
        success: true,
        message: "Matéria criada com sucesso",
        data: { materia },
      });
    } catch (error) {
      next(error);
      return;
    }
  };

  // GET /api/materia?EscolaGUID=&MateriaStatus=&MateriaIsTecnico=
  index = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("🔵 MateriaController.index()");

    try {
      const filters: MateriaFilters = {
        EscolaGUID: req.query.EscolaGUID as string | undefined,
        MateriaStatus: req.query.MateriaStatus as "Ativa" | "Inativa" | undefined,
        MateriaIsTecnica:
          req.query.MateriaIsTecnica === "true"
            ? true
            : req.query.MateriaIsTecnica === "false"
            ? false
            : undefined,
      };

      const materias = await this.#materiaService.listarMaterias(filters);

      res.json({
        success: true,
        message: "Matérias listadas com sucesso",
        data: {
          materias,
          total: materias.length,
        },
      });
    } catch (error) {
      next(error);
      return;
    }
  };

  // GET /api/materia/:guid
  show = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("🔵 MateriaController.show()");

    try {
      const materia = await this.#materiaService.buscarMateria(req.params.guid);

      res.json({
        success: true,
        message: "Matéria encontrada",
        data: { materia },
      });
    } catch (error) {
      next(error);
      return;
    }
  };

  // PUT /api/materia/:guid
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("🔵 MateriaController.update()");

    try {
      const usuarioCPF = req.user?.UsuarioCPF;

      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Usuário não autenticado",
          data: null,
        });
        return;
      }

      const materia = await this.#materiaService.atualizarMateria(
        req.params.guid,
        req.body.materia,
        usuarioCPF
      );

      res.json({
        success: true,
        message: "Matéria atualizada com sucesso",
        data: { materia },
      });
    } catch (error) {
      next(error);
      return;
    }
  };

  // DELETE /api/materia/:guid
  destroy = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("🔵 MateriaController.destroy()");

    try {
      const usuarioCPF = req.user?.UsuarioCPF;

      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Usuário não autenticado",
          data: null,
        });
        return;
      }

      await this.#materiaService.excluirMateria(req.params.guid, usuarioCPF);

      res.json({
        success: true,
        message: "Matéria excluída com sucesso",
        data: null,
      });
    } catch (error) {
      next(error);
      return;
    }
  };
}
