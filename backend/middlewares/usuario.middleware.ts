import { NextFunction, Request, Response } from "express";
import {
  UsuarioCreateBodySchema,
  UsuarioUpdateBodySchema,
  UsuarioSenhaBodySchema,
  UsuarioCPFParamSchema,
  ehCorpoEmMassa,
} from "../schemas/usuario.schema";
import { zodValidate } from "../utils/zodValidate";

const escreverUsuarioValidado = (request: Request, dados: unknown): void => {
  request.body.usuario = dados;
};

const validarCreateBodyZod = zodValidate(UsuarioCreateBodySchema, "body", "Erro na validação de dados", {
  aposSucesso: escreverUsuarioValidado,
});

const validarUpdateBodyZod = zodValidate(UsuarioUpdateBodySchema, "body", "Erro na validação de dados", {
  aposSucesso: escreverUsuarioValidado,
});

export default class UsuarioMiddleware {
  validateCreateBody = (request: Request, response: Response, next: NextFunction): void => {
    console.log("🔷 UsuarioMiddleware.validateCreateBody()");
    // Cadastro em massa (`{ usuarios: [...] }`) não passa pela validação de
    // usuário único — o controller/service já trata item a item de forma
    // resiliente (ver ehCorpoEmMassa em backend/schemas/usuario.schema.ts).
    if (ehCorpoEmMassa(request.body)) {
      next();
      return;
    }
    validarCreateBodyZod(request, response, next);
  };

  validateUpdateBody = validarUpdateBodyZod;

  validateSenhaBody = zodValidate(UsuarioSenhaBodySchema, "body");

  validateCpfParam = zodValidate(UsuarioCPFParamSchema, "params");
}
