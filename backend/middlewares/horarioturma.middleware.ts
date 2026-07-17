import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";
import { DIAS_SEMANA, isHoraValida } from "../utils/gradeHoraria.util";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class HorarioTurmaMiddleware {
  static validarTurmaGUID = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 HorarioTurmaMiddleware.validarTurmaGUID()");

    const { turmaGUID } = req.params;

    if (!turmaGUID || !uuidRegex.test(turmaGUID)) {
      return next(
        new ErrorResponse(400, "TurmaGUID inválido", {
          message: "O parâmetro turmaGUID deve ser um UUID válido",
        })
      );
    }

    next();
  };

  static validarHorarioTurmaGUID = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 HorarioTurmaMiddleware.validarHorarioTurmaGUID()");

    const { horarioTurmaGUID } = req.params;

    if (!horarioTurmaGUID || !uuidRegex.test(horarioTurmaGUID)) {
      return next(
        new ErrorResponse(400, "HorarioTurmaGUID inválido", {
          message: "O parâmetro horarioTurmaGUID deve ser um UUID válido",
        })
      );
    }

    next();
  };

  static validarCriacaoSlot = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 HorarioTurmaMiddleware.validarCriacaoSlot()");

    const { slot } = req.body;

    if (!slot || typeof slot !== "object") {
      return next(
        new ErrorResponse(400, "Dados inválidos", {
          message: "O campo 'slot' é obrigatório",
        })
      );
    }

    if (!slot.MatProfTurGUID || !uuidRegex.test(slot.MatProfTurGUID)) {
      return next(
        new ErrorResponse(400, "MatProfTurGUID inválido", {
          message: "MatProfTurGUID é obrigatório e deve ser um UUID válido",
        })
      );
    }

    if (!slot.DiaSemana || !DIAS_SEMANA.includes(slot.DiaSemana)) {
      return next(
        new ErrorResponse(400, "DiaSemana inválido", {
          message: `DiaSemana é obrigatório e deve ser um dos: ${DIAS_SEMANA.join(", ")}`,
        })
      );
    }

    if (!isHoraValida(slot.HoraInicio) || !isHoraValida(slot.HoraFim)) {
      return next(
        new ErrorResponse(400, "Horário inválido", {
          message: "HoraInicio e HoraFim são obrigatórios e devem estar no formato HH:MM",
        })
      );
    }

    if (slot.HoraInicio >= slot.HoraFim) {
      return next(
        new ErrorResponse(400, "Horário inválido", {
          message: "HoraInicio deve ser anterior a HoraFim",
        })
      );
    }

    next();
  };
}
