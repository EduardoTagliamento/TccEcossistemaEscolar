import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";
import { CriarTurmaBodySchema, AtualizarTurmaBodySchema, TurmaGUIDParamSchema, ehCorpoEmMassa } from "../schemas/turma.schema";
import { zodValidate } from "../utils/zodValidate";

const validarCriacaoZod = zodValidate(CriarTurmaBodySchema, "body", "", { semDetails: true });

export class TurmaMiddleware {
  static validarCriacao = (req: Request, res: Response, next: NextFunction): void => {
    if (ehCorpoEmMassa(req.body)) {
      if ((req.body.turmas as unknown[]).length === 0) {
        throw new ErrorResponse(400, 'Array "turmas" não pode estar vazio');
      }
      next();
      return;
    }
    validarCriacaoZod(req, res, next);
  };

  static validarAtualizacao = zodValidate(AtualizarTurmaBodySchema, "body", "", { semDetails: true });

  static validarGUID = zodValidate(TurmaGUIDParamSchema, "params", "", { semDetails: true });
}
