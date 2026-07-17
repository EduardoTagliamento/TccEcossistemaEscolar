import { Request, Response, NextFunction } from "express";
import HorarioTurmaService from "../services/horarioturma.service";

export class GradeHorariaController {
  #horarioTurmaService: HorarioTurmaService;

  constructor(horarioTurmaService: HorarioTurmaService) {
    console.log("⬆️  GradeHorariaController.constructor()");
    this.#horarioTurmaService = horarioTurmaService;
  }

  // POST /api/grade-horaria/calcular-datas
  calcularDatas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 GradeHorariaController.calcularDatas()");

    try {
      const { MateriaGUID, Escolhas } = req.body;

      const resultados = await this.#horarioTurmaService.calcularDatas(MateriaGUID, Escolhas);

      res.json({
        success: true,
        message: "Datas calculadas com sucesso",
        data: { resultados },
      });
    } catch (error) {
      next(error);
    }
  };
}
