import { Request } from "express";
import { ValidarCodigoBodySchema, ValidarReenviarBodySchema, GuidParamSchema } from "../schemas/verificacaoEmail.schema";
import { zodValidate } from "../utils/zodValidate";

export default class VerificacaoEmailMiddleware {
  constructor() {
    console.log("⬆️  VerificacaoEmailMiddleware.constructor()");
  }

  validateCodigoBody = zodValidate(ValidarCodigoBodySchema, "body", "Erro na validação de dados", {
    aposSucesso: (request: Request, dados: unknown) => {
      request.body.verificacao = dados;
    },
  });

  validateReenviarBody = zodValidate(ValidarReenviarBodySchema, "body", "Erro na validação de dados", {
    aposSucesso: (request: Request, dados: unknown) => {
      request.body.verificacao = dados;
    },
  });

  validateGuidParam = zodValidate(GuidParamSchema, "params", "Erro na validação de dados", {
    aposSucesso: (request: Request, dados: unknown) => {
      request.params.UsuarioGUID = dados as string;
    },
  });
}
