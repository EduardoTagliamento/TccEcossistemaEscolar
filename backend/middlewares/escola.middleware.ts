import { NextFunction, Request, Response } from "express";
import {
  EscolaCreateBodySchema,
  EscolaUpdateBodySchema,
  EscolaTransferirDirecaoBodySchema,
  EscolaIdParamSchema,
} from "../schemas/escola.schema";
import { zodValidate } from "../utils/zodValidate";

const escreverEscolaValidada = (request: Request, dados: unknown): void => {
  request.body.escola = dados;
};

export default class EscolaMiddleware {
  validateCreateBody = zodValidate(EscolaCreateBodySchema, "body", "Erro na validação de dados", {
    aposSucesso: escreverEscolaValidada,
  });

  validateUpdateBody = zodValidate(EscolaUpdateBodySchema, "body", "Erro na validação de dados", {
    aposSucesso: escreverEscolaValidada,
  });

  validateTransferirDirecaoBody = zodValidate(EscolaTransferirDirecaoBodySchema, "body");

  validateIdParam = zodValidate(EscolaIdParamSchema, "params");
}
