import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";
import {
  CriarMateriaBodySchema,
  AtualizarMateriaBodySchema,
  MateriaGUIDParamSchema,
  ehCorpoEmMassa,
  mensagemTopoMateria,
} from "../schemas/materia.schema";
import { zodValidate } from "../utils/zodValidate";

const validarCriacaoZod = zodValidate(CriarMateriaBodySchema, "body", mensagemTopoMateria);

export class MateriaMiddleware {
  static validarCriacao = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 MateriaMiddleware.validarCriacao()");
    if (ehCorpoEmMassa(req.body)) {
      if ((req.body.materias as unknown[]).length === 0) {
        return next(new ErrorResponse(400, "Dados inválidos", { message: 'Array "materias" não pode estar vazio' }));
      }
      return next();
    }
    validarCriacaoZod(req, res, next);
  };

  static validarAtualizacao = zodValidate(AtualizarMateriaBodySchema, "body", mensagemTopoMateria);

  static validarGUID = zodValidate(MateriaGUIDParamSchema, "params", mensagemTopoMateria);
}
