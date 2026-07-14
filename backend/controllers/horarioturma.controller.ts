import { Request, Response, NextFunction } from "express";
import HorarioTurmaService from "../services/horarioturma.service";

export class HorarioTurmaController {
  #horarioTurmaService: HorarioTurmaService;

  constructor(horarioTurmaService: HorarioTurmaService) {
    console.log("⬆️  HorarioTurmaController.constructor()");
    this.#horarioTurmaService = horarioTurmaService;
  }

  // GET /api/turma/:turmaGUID/cronograma
  show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 HorarioTurmaController.show()");

    try {
      const cronograma = await this.#horarioTurmaService.obterCronograma(req.params.turmaGUID);

      res.json({
        success: true,
        message: "Cronograma obtido com sucesso",
        data: { cronograma },
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/turma/:turmaGUID/cronograma/slot
  store = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 HorarioTurmaController.store()");

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

      const slot = await this.#horarioTurmaService.alocarSlot(
        req.params.turmaGUID,
        req.body.slot,
        usuarioCPF
      );

      res.status(201).json({
        success: true,
        message: "Matéria alocada no cronograma com sucesso",
        data: { slot },
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/turma/:turmaGUID/cronograma/slot/:horarioTurmaGUID
  destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 HorarioTurmaController.destroy()");

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

      await this.#horarioTurmaService.removerSlot(
        req.params.turmaGUID,
        req.params.horarioTurmaGUID,
        usuarioCPF
      );

      res.json({
        success: true,
        message: "Matéria removida do horário (voltou para o banco)",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
}
