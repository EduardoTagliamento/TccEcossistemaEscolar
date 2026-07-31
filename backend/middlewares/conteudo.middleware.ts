import { Request, Response, NextFunction } from "express";
import { zodValidate } from "../utils/zodValidate";
import { ConteudoGuidParamSchema, ConteudoCriacaoBodySchema, mensagemTopoConteudo } from "../schemas/conteudo.schema";

export class ConteudoMiddleware {
  static validarCriacao = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 ConteudoMiddleware.validarCriacao()");
    zodValidate(ConteudoCriacaoBodySchema, "body", mensagemTopoConteudo)(req, res, next);
  };

  static validarGUID = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 ConteudoMiddleware.validarGUID()");
    zodValidate(ConteudoGuidParamSchema, "params", mensagemTopoConteudo)(req, res, next);
  };
}
