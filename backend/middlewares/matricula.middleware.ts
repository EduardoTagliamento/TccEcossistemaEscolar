import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";
import {
  CriarMatriculaBodySchema,
  AtualizarMatriculaBodySchema,
  TransferenciaBodySchema,
  MatriculaGUIDParamSchema,
  ehCorpoEmMassa,
} from "../schemas/matricula.schema";
import { zodValidate } from "../utils/zodValidate";

const validarCriacaoZod = zodValidate(CriarMatriculaBodySchema, "body", "", { semDetails: true });

export class MatriculaMiddleware {
  static validarCriacao = (req: Request, res: Response, next: NextFunction): void => {
    // Cadastro em massa (`{ matriculas: [...] }`) pula a validação detalhada
    // de matrícula única — só checa não-vazio, controller valida item a item.
    if (ehCorpoEmMassa(req.body)) {
      if ((req.body.matriculas as unknown[]).length === 0) {
        throw new ErrorResponse(400, 'Array "matriculas" não pode estar vazio');
      }
      next();
      return;
    }
    validarCriacaoZod(req, res, next);
  };

  static validarAtualizacao = zodValidate(AtualizarMatriculaBodySchema, "body", "", { semDetails: true });

  static validarTransferencia = zodValidate(TransferenciaBodySchema, "body", "", { semDetails: true });

  static validarGUID = zodValidate(MatriculaGUIDParamSchema, "params", "", { semDetails: true });
}
