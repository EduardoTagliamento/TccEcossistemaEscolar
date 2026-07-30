import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import ErrorResponse from "./ErrorResponse";

type Origem = "body" | "params" | "query";

/**
 * Adapta um schema Zod para o contrato de erro já usado no projeto:
 * ErrorResponse(400, "Erro na validação de dados", { message }).
 * Sem isso, um ZodError vazando até o handler global cairia no branch
 * genérico de 500 (ver backend/Server.ts::setupErrorMiddleware).
 */
export function zodValidate(schema: ZodType, origem: Origem = "body") {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const resultado = schema.safeParse(request[origem]);

    if (!resultado.success) {
      const primeiroIssue = resultado.error.issues[0];
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: primeiroIssue?.message ?? "Dados inválidos.",
      });
    }

    next();
  };
}
