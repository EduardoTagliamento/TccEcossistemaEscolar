import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";
import { DIAS_SEMANA } from "../utils/gradeHoraria.util";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATA_SIMPLES_REGEX = /^\d{4}-\d{2}-\d{2}/;

export class GradeHorariaMiddleware {
  static validarCalcularDatas = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 GradeHorariaMiddleware.validarCalcularDatas()");

    const { MateriaGUID, Escolhas } = req.body;

    if (!MateriaGUID || !uuidRegex.test(MateriaGUID)) {
      return next(
        new ErrorResponse(400, "MateriaGUID inválido", {
          message: "MateriaGUID é obrigatório e deve ser um UUID válido",
        })
      );
    }

    if (!Array.isArray(Escolhas) || Escolhas.length === 0) {
      return next(
        new ErrorResponse(400, "Escolhas inválido", {
          message: "Escolhas é obrigatório e deve ser um array não vazio",
        })
      );
    }

    for (const escolha of Escolhas) {
      if (!escolha?.TurmaGUID || !uuidRegex.test(escolha.TurmaGUID)) {
        return next(
          new ErrorResponse(400, "TurmaGUID inválido", {
            message: "Cada escolha deve ter um TurmaGUID válido",
          })
        );
      }

      if (!escolha.SemanaBase || !DATA_SIMPLES_REGEX.test(escolha.SemanaBase)) {
        return next(
          new ErrorResponse(400, "SemanaBase inválida", {
            message: "Cada escolha deve ter SemanaBase no formato YYYY-MM-DD",
          })
        );
      }

      if (escolha.DiaSemana !== undefined && !DIAS_SEMANA.includes(escolha.DiaSemana)) {
        return next(
          new ErrorResponse(400, "DiaSemana inválido", {
            message: `DiaSemana deve ser um dos: ${DIAS_SEMANA.join(", ")}`,
          })
        );
      }

      if (
        escolha.DeslocamentoMinutos !== undefined &&
        typeof escolha.DeslocamentoMinutos !== "number"
      ) {
        return next(
          new ErrorResponse(400, "DeslocamentoMinutos inválido", {
            message: "DeslocamentoMinutos deve ser um número (pode ser negativo)",
          })
        );
      }
    }

    next();
  };
}
