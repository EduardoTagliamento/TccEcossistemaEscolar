import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";
import { CriarCursoBodySchema, AtualizarCursoBodySchema, CursoGUIDParamSchema, ehCorpoEmMassa } from "../schemas/curso.schema";
import { zodValidate } from "../utils/zodValidate";

const validarCriacaoZod = zodValidate(CriarCursoBodySchema, "body", "", { semDetails: true });

export class CursoMiddleware {
  static validarCriacao = (req: Request, res: Response, next: NextFunction): void => {
    if (ehCorpoEmMassa(req.body)) {
      if ((req.body.cursos as unknown[]).length === 0) {
        throw new ErrorResponse(400, 'Array "cursos" não pode estar vazio');
      }
      next();
      return;
    }
    validarCriacaoZod(req, res, next);
  };

  static validarAtualizacao = zodValidate(AtualizarCursoBodySchema, "body", "", { semDetails: true });

  static validarGUID = zodValidate(CursoGUIDParamSchema, "params", "", { semDetails: true });
}
