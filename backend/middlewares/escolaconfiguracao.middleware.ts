import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";
import { DIAS_SEMANA, isHoraValida } from "../utils/gradeHoraria.util";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class EscolaConfiguracaoMiddleware {
  static validarEscolaGUID = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 EscolaConfiguracaoMiddleware.validarEscolaGUID()");

    const { escolaGUID } = req.params;

    if (!escolaGUID || !uuidRegex.test(escolaGUID)) {
      return next(
        new ErrorResponse(400, "EscolaGUID inválido", {
          message: "O parâmetro escolaGUID deve ser um UUID válido",
        })
      );
    }

    next();
  };

  static validarAtualizacao = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 EscolaConfiguracaoMiddleware.validarAtualizacao()");

    const { configuracao } = req.body;

    if (!configuracao) {
      return next(
        new ErrorResponse(400, "Dados inválidos", {
          message: "O campo 'configuracao' é obrigatório",
        })
      );
    }

    const {
      MinutosPorAula,
      DiasSemana,
      PeriodoManhaInicio,
      PeriodoManhaFim,
      TemAulaTarde,
      PeriodoTardeInicio,
      PeriodoTardeFim,
      IntervaloVariado,
      Intervalos,
    } = configuracao;

    if (typeof MinutosPorAula !== "number" || !Number.isInteger(MinutosPorAula)) {
      return next(
        new ErrorResponse(400, "MinutosPorAula inválido", {
          message: "MinutosPorAula é obrigatório e deve ser um número inteiro",
        })
      );
    }

    if (!Array.isArray(DiasSemana) || DiasSemana.length === 0) {
      return next(
        new ErrorResponse(400, "DiasSemana inválido", {
          message: "DiasSemana é obrigatório e deve conter ao menos um dia",
        })
      );
    }

    const diaInvalido = DiasSemana.find((dia: unknown) => !DIAS_SEMANA.includes(dia as any));
    if (diaInvalido) {
      return next(
        new ErrorResponse(400, "DiasSemana inválido", {
          message: `Dia da semana inválido: "${diaInvalido}"`,
        })
      );
    }

    if (!isHoraValida(PeriodoManhaInicio) || !isHoraValida(PeriodoManhaFim)) {
      return next(
        new ErrorResponse(400, "Período da manhã inválido", {
          message: "PeriodoManhaInicio e PeriodoManhaFim são obrigatórios e devem estar no formato HH:MM",
        })
      );
    }

    if (typeof TemAulaTarde !== "boolean") {
      return next(
        new ErrorResponse(400, "TemAulaTarde inválido", {
          message: "TemAulaTarde é obrigatório e deve ser um booleano",
        })
      );
    }

    if (TemAulaTarde && (!isHoraValida(PeriodoTardeInicio) || !isHoraValida(PeriodoTardeFim))) {
      return next(
        new ErrorResponse(400, "Período da tarde inválido", {
          message: "Quando TemAulaTarde=true, PeriodoTardeInicio e PeriodoTardeFim são obrigatórios (HH:MM)",
        })
      );
    }

    if (typeof IntervaloVariado !== "boolean") {
      return next(
        new ErrorResponse(400, "IntervaloVariado inválido", {
          message: "IntervaloVariado é obrigatório e deve ser um booleano",
        })
      );
    }

    if (!Array.isArray(Intervalos)) {
      return next(
        new ErrorResponse(400, "Intervalos inválido", {
          message: "Intervalos deve ser um array (pode ser vazio)",
        })
      );
    }

    for (const intervalo of Intervalos) {
      if (!isHoraValida(intervalo?.IntervaloInicio) || !isHoraValida(intervalo?.IntervaloFim)) {
        return next(
          new ErrorResponse(400, "Intervalo inválido", {
            message: "Cada intervalo deve ter IntervaloInicio e IntervaloFim no formato HH:MM",
          })
        );
      }

      if (
        IntervaloVariado &&
        (!intervalo.DiaSemana || !DIAS_SEMANA.includes(intervalo.DiaSemana))
      ) {
        return next(
          new ErrorResponse(400, "Intervalo inválido", {
            message: "Com IntervaloVariado=true, cada intervalo deve informar um DiaSemana válido",
          })
        );
      }
    }

    next();
  };
}
